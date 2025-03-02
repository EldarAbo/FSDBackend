import userModel from '../models/usersModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  const authorization = req.header('Authorization');
  if (!authorization) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  const token = authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: Invalid token format' });
  }

  if (!process.env.TOKEN_SECRET) {
    return res.status(500).json({ message: 'Server Error: Token secret not configured' });
  }

  try {
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = { userId: verified._id };
    console.log('auth successful');
    next();    
  } catch (err) {
    return res.status(401).json({ message: 'Access Denied: Invalid token' });
  }
};

const generateToken = (userId) => {
  if (!process.env.TOKEN_SECRET) {
    return null;
  }

  const random = Math.random().toString();
  const accessToken = jwt.sign(
    {
      _id: userId,
      random: random
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES || '15m' }
  );

  const refreshToken = jwt.sign(
    {
      _id: userId,
      random: random
    },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d' }
  );

  return {
    accessToken,
    refreshToken
  };
};

const register = async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists before creating
    const existingUser = await userModel.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ 
        message: `duplicate ${field} error: This ${field} is already taken.` 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
      refreshToken: [] // Initialize empty refresh token array
    });

    // Generate tokens
    const tokens = generateToken(user._id.toString());
    if (!tokens) {
      return res.status(500).json({ message: 'Error generating tokens' });
    }

    // Store refresh token
    user.refreshToken = [tokens.refreshToken];
    await user.save();

    console.log('User registered successfully:', user._id);

    // Send response
    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: user._id,
      username: user.username
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `duplicate ${duplicateField} error: This ${duplicateField} is already taken.`
      });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    console.log('Login request body:', req.body);
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate tokens
    const tokens = generateToken(user._id.toString());
    if (!tokens) {
      return res.status(500).json({ message: 'Error generating tokens' });
    }

    // Update refresh tokens
    if (!user.refreshToken) {
      user.refreshToken = [];
    }
    user.refreshToken.push(tokens.refreshToken);
    await user.save();

    console.log('User logged in successfully:', user._id);

    // Send response
    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      id: user._id,
      username: user.username
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const verifyRefreshToken = async (refreshToken) => {
  if (!process.env.TOKEN_SECRET) {
    throw new Error('Server Error: Token secret not configured');
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.TOKEN_SECRET);
    
    if (!payload || !payload._id) {
      throw new Error('Invalid token payload');
    }
    
    const user = await userModel.findById(payload._id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.refreshToken || !user.refreshToken.includes(refreshToken)) {
      throw new Error('Token not found in user records');
    }
    
    return user;
  } catch (error) {
    console.error('Token verification error:', error.message);
    throw new Error('Invalid refresh token');
  }
};

const refresh = async (req, res) => {
  try {
    console.log('Refresh token request body:', req.body);
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    try {
      const user = await verifyRefreshToken(refreshToken);
      
      // Generate new tokens
      const tokens = generateToken(user._id);
      if (!tokens) {
        return res.status(500).json({ message: 'Error generating tokens' });
      }

      // Update refresh tokens
      user.refreshToken = user.refreshToken.filter((token) => token !== refreshToken);
      user.refreshToken.push(tokens.refreshToken);
      await user.save();

      console.log('Token refreshed successfully for user:', user._id);

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        id: user._id
      });
    } catch (error) {
      console.error('Refresh verification error:', error.message);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Server error during token refresh' });
  }
};

const logout = async (req, res) => {
  try {
    console.log('Logout request body:', req.body);
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    try {
      const user = await verifyRefreshToken(refreshToken);
      
      // Remove the refresh token
      user.refreshToken = user.refreshToken.filter((token) => token !== refreshToken);
      await user.save();

      console.log('User logged out successfully:', user._id);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      // Token verification failed
      console.error('Logout verification error:', error.message);
      return res.status(400).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// Profile endpoint
const profile = async (req, res) => {
  try {
    console.log('Profile request for user ID:', req.user?.userId);
    
    // req.user should be set by authMiddleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User ID not found in request' });
    }
    
    const user = await userModel.findById(req.user.userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile fetched successfully for user:', user._id);
    
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export { authMiddleware };

export default {
  register,
  login,
  logout,
  refresh,
  profile,
  authMiddleware,
  generateToken
};