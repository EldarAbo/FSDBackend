import dotenv from "dotenv"
dotenv.config();
import mongoose from "mongoose";
import bodyParser from "body-parser";
import express from "express";
import usersRoute from "./routes/usersRoute.js";
import authRoutes from "./routes/authRoute.js";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from "swagger-ui-express";
import cors from "cors";
import session from 'express-session';
import passport from 'passport';
import gptRoutes from "./routes/gptRoute.js"; 
import subjectRoutes from "./routes/subjectRoute.js";
import contentRoutes from "./routes/contentRoute.js";
//import "./scheduler/notificationScheduler.js";
import notificationRoutes from "./routes/notificationRoute.js";


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cors({
//   origin: process.env.BASE_URL + ':5173', // Our React app's URL
// }));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "*");
    next();
  });
  app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        }
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use("/auth", authRoutes);
//app.use("/storage", fileRoute);
app.use("/users", usersRoute);
app.use("/notifications", notificationRoutes);
app.use("/gpt", gptRoutes); // Add the GPT routes
app.use("/subjects", subjectRoutes);
app.use("/content", contentRoutes);
//app.use("/storage", express.static("storage"));
app.use(express.static("front"));
const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Web Dev 2025 REST API",
        version: "1.0.0",
        description: "REST server including authentication using JWT",
      },
      servers: [{ url: process.env.API_URL, },{ url: process.env.API_URLS, },],
    },
    apis: ["./routes/*.js"], // Changed from .ts to .js
  };
const specs = swaggerJsDoc(options);
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to database"));
const initApp = () => {
    return new Promise((resolve, reject) => {
      if (!process.env.DB_CONNECT) {
        reject("DB_CONNECT is not defined in .env file");
      } else {
        mongoose
          .connect(process.env.DB_CONNECT)
          .then(() => {
            resolve(app);
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
  };
  export default initApp;