import request from "supertest";
import mongoose from "mongoose";
import Notification from "../models/notificationModel.js";
import initApp from "../server.js";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

let app;
let user;
let token;

beforeAll(async () => {
  process.env.MONGO_URI = process.env.DB_CONNECT || "mongodb://localhost:27017/test-db";
  process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || "test-secret"; // Ensure TOKEN_SECRET is set
  app = await initApp();
  // Create a test user
  user = await userModel.create({
    email: "ronittz@gmail.com",
    username: "testuser",
    fullName: "Test User",
    password: "hashedpassword",
  });
  // Generate a valid JWT token for the test user
  token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "1h" });
});
afterAll(async () => {
    //await userModel.deleteMany({});
    await mongoose.connection.close();
});

afterEach(async () => {
  //await Notification.deleteMany({});
});

describe("NotificationController", () => {
  it("should create a new notification", async () => {
    const res = await request(app).post("/notifications").send({
      subjectId: new mongoose.Types.ObjectId().toString(),
      day: "Monday",
      time: {
        hour: 9,
        minute: 30,
      },
      userId: user._id,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.day).toBe("Monday");
    expect(res.body.time.hour).toBe(9);
    expect(res.body.time.minute).toBe(30);
  });

  it("should get notifications for a user", async () => {
    await Notification.create({
      subjectId: new mongoose.Types.ObjectId(),
      day: "Wednesday",
      time: { hour: 15, minute: 52 },
      userId: user._id,
    });

    const res = await request(app).get("/notifications/user/"+user._id);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1].day).toBe("Wednesday");
    expect(res.body[1].time.hour).toBe(15);
    expect(res.body[1].time.minute).toBe(52);
  });

  it("should delete a notification", async () => {
    const notification = await Notification.create({
      subjectId: new mongoose.Types.ObjectId(),
      day: "Friday",
      time: { hour: 8, minute: 15 },
      userId: user._id,
    });

    const res = await request(app).delete(`/notifications/${notification._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Notification deleted");

    const found = await Notification.findById(notification._id);
    expect(found).toBeNull();
  });
});
