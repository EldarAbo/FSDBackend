import express from "express";
import userModel from '../models/usersModel.js';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const register = async (req, res) => {
  try {
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    let imgUrl = req.body.imgUrl || null;

    const user = await userModel.create({
      email: req.body.email,
      username: req.body.username,
      fullName: req.body.fullName,
      password: hashedPassword,
      imgUrl: imgUrl,
      refreshToken: [],
    });

    const tokens = await generateToken(user._id.toString());
    if (!tokens) {
      res.status(500).json({ message: "Error generating token" });
      return;
    }
    user.refreshToken = [tokens.refreshToken];
    await user.save();

    res.status(200).send({ ...user.toObject(), accessToken: tokens.accessToken });
  } catch (err) {
    res.status(400).send(err);
  }
};

const generateToken = async (userId) => {
  if (!process.env.TOKEN_SECRET) {
    return null;
  }
  const random = Math.random().toString();
  const accessToken = jwt.sign(
    { _id: userId, random: random },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRES }
  );
  const refreshToken = jwt.sign(
    { _id: userId, random: random },
    process.env.TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
  );
  return { accessToken, refreshToken };
};

const login = async (req, res) => {
  try {
    const user = await userModel.findOne({
      $or: [
        { email: req.body.emailOrusername },
        { username: req.body.emailOrusername },
      ],
    });

    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
      res.status(400).send("wrong username or password");
      return;
    }

    const tokens = await generateToken(user._id);
    if (!tokens) {
      res.status(500).send("Server Error");
      return;
    }
    user.refreshToken.push(tokens.refreshToken);
    await user.save();

    res.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user,
    });
  } catch (err) {
    res.status(400).send(err);
  }
};

const verifyRefreshToken = (refreshToken) => {
  return new Promise(async (resolve, reject) => {
    if (!refreshToken || !process.env.TOKEN_SECRET) {
      reject("fail");
      return;
    }
    jwt.verify(refreshToken, process.env.TOKEN_SECRET, async (err, payload) => {
      if (err) {
        reject("fail");
        return;
      }
      const user = await userModel.findById(payload._id);
      if (!user || !user.refreshToken.includes(refreshToken)) {
        reject("fail");
        return;
      }
      user.refreshToken = user.refreshToken.filter((token) => token !== refreshToken);
      await user.save();
      resolve(user);
    });
  });
};

const logout = async (req, res) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);
    await user.save();
    res.status(200).send("success");
  } catch (err) {
    res.status(400).send("fail");
  }
};

const refresh = async (req, res) => {
  try {
    const user = await verifyRefreshToken(req.body.refreshToken);
    if (!user) {
      res.status(400).send("fail");
      return;
    }
    const tokens = await generateToken(user._id);
    if (!tokens) {
      res.status(500).send("Server Error");
      return;
    }
    user.refreshToken.push(tokens.refreshToken);
    await user.save();
    res.status(200).send({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      _id: user._id,
    });
  } catch (err) {
    res.status(400).send(err);
  }
};

export const authMiddleware = (req, res, next) => {
  const authorization = req.header("Authorization");
  const token = authorization && authorization.split(" ")[1];

  if (!token || !process.env.TOKEN_SECRET) {
    res.status(401).send("Access Denied");
    return;
  }

  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    if (err) {
      res.status(401).send("Access Denied");
      return;
    }
    req.params.userId = payload._id;
    next();
  });
};

export default { register, login, refresh, logout };
