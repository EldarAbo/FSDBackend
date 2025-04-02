import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleSignin = async (req, res) => {
  const credential = req.body.credential;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log(payload);

    const email = payload?.email;
    const name = payload?.name;
    let user = await userModel.findOne({ email });
    if (!user) {
      user = await userModel.create({
        email,
        username: email,
        fullName: name,
        imgUrl: payload?.picture,
        password: "google-signin",
      });
    }
    const tokens = await generateToken(user._id);
    if (!tokens) return res.status(500).send("Server Error");
    
    user.refreshToken = user.refreshToken || [];
    user.refreshToken.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
  } catch (err) {
    res.status(400).send(`Error: ${err}`);
  }
};

const register = async (req, res) => {
  try {
    const { email, username, fullName, password, imgUrl } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await userModel.create({
      email,
      username,
      fullName,
      password: hashedPassword,
      imgUrl: imgUrl || null,
      refreshToken: [],
    });

    const tokens = await generateToken(user._id.toString());
    if (!tokens) return res.status(500).json({ message: "Error generating token" });
    
    user.refreshToken = [tokens.refreshToken];
    await user.save();
    res.status(200).send({ ...user.toObject(), accessToken: tokens.accessToken });
  } catch (err) {
    res.status(400).send(err);
  }
};

const generateToken = async (userId) => {
  if (!process.env.TOKEN_SECRET) return null;
  const random = Math.random().toString();
  return {
    accessToken: jwt.sign({ _id: userId, random }, process.env.TOKEN_SECRET, { expiresIn: process.env.TOKEN_EXPIRES }),
    refreshToken: jwt.sign({ _id: userId, random }, process.env.TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }),
  };
};

const login = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.emailOrusername }) ||
                  await userModel.findOne({ username: req.body.emailOrusername });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      return res.status(400).send("Wrong username or password");
    }
    
    const tokens = await generateToken(user._id);
    if (!tokens) return res.status(500).send("Server Error");
    
    user.refreshToken = user.refreshToken || [];
    user.refreshToken.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user });
  } catch (err) {
    res.status(400).send(err);
  }
};

const verifyRefreshToken = (refreshToken) => {
  return new Promise(async (resolve, reject) => {
    if (!refreshToken || !process.env.TOKEN_SECRET) return reject("fail");
    jwt.verify(refreshToken, process.env.TOKEN_SECRET, async (err, payload) => {
      if (err) return reject("fail");
      try {
        const user = await userModel.findById(payload._id);
        if (!user || !user.refreshToken.includes(refreshToken)) {
          user.refreshToken = [];
          await user.save();
          return reject("fail");
        }
        user.refreshToken = user.refreshToken.filter(token => token !== refreshToken);
        resolve(user);
      } catch {
        reject("fail");
      }
    });
  });
};

const logout = async (req, res) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);
    await user.save();
    res.status(200).send("success");
  } catch {
    res.status(400).send("fail");
  }
};

const refresh = async (req, res) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);
    if (!user) return res.status(400).send("fail");

    const tokens = await generateToken(user._id);
    if (!tokens) return res.status(500).send("Server Error");
    
    user.refreshToken.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, _id: user._id });
  } catch (err) {
    res.status(400).send(err);
  }
};

const authMiddleware = (req, res, next) => {
  const authorization = req.header("Authorization");
  const token = authorization && authorization.split(" ")[1];
  if (!token || !process.env.TOKEN_SECRET) return res.status(401).send("Access Denied");
  
  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    if (err) return res.status(401).send("Access Denied");
    req.params.userId = payload._id;
    next();
  });
};

export default { register, login, googleSignin, refresh, logout, authMiddleware };
