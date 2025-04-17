import request from "supertest";
import mongoose from "mongoose";
import initApp from "../server.js";
import subjectModel from "../models/subjectModel.js";
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";

describe("Subject Routes Integration Tests", () => {
  let app;
  let user;
  let token;

  // Connect to the test database before all tests
  beforeAll(async () => {
    process.env.MONGO_URI = process.env.DB_CONNECT || "mongodb://localhost:27017/test-db";
    process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || "test-secret"; // Ensure TOKEN_SECRET is set
    app = await initApp();

    // Create a test user
    user = await userModel.create({
      email: "testuser@example.com",
      username: "testuser",
      fullName: "Test User",
      password: "hashedpassword",
    });

    // Generate a valid JWT token for the test user
    token = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, { expiresIn: "1h" });
  });

  // Disconnect from the database after all tests
  afterAll(async () => {
    await subjectModel.deleteMany({});
    await userModel.deleteMany({});
    await mongoose.connection.close();
  });

  // Clear the test database before each test
  beforeEach(async () => {
    await subjectModel.deleteMany({});
  });

  describe("POST /subjects", () => {
    it("should create a new subject successfully", async () => {
      const response = await request(app)
        .post("/subjects")
        .set("Authorization", `Bearer ${token}`) // Add Authorization header
        .send({
          title: "Test Subject",
          description: "This is a test subject",
          userId: user._id,
          resultsId: new mongoose.Types.ObjectId(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("title", "Test Subject");
      expect(response.body).toHaveProperty("description", "This is a test subject");

      // Verify subject was created in the database
      const subject = await subjectModel.findOne({ title: "Test Subject" });
      expect(subject).toBeTruthy();
      expect(subject.userId.toString()).toBe(user._id.toString());
    });

    it("should return an error if required fields are missing", async () => {
      const response = await request(app)
        .post("/subjects")
        .set("Authorization", `Bearer ${token}`) // Add Authorization header
        .send({
          title: "Incomplete Subject",
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /subjects/user/:userId", () => {
    it("should get all subjects created by a specific user", async () => {
      // Create test subjects
      await subjectModel.create([
        {
          title: "Subject 1",
          description: "Description 1",
          userId: user._id, // Ensure this matches the test user
          resultsId: new mongoose.Types.ObjectId(),
        },
        {
          title: "Subject 2",
          description: "Description 2",
          userId: user._id, // Ensure this matches the test user
          resultsId: new mongoose.Types.ObjectId(),
        },
      ]);

      const response = await request(app)
        .get(`/subjects/user/${user._id}`) // Use the correct userId
        .set("Authorization", `Bearer ${token}`); // Add Authorization header
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty("title", "Subject 1");
      expect(response.body[1]).toHaveProperty("title", "Subject 2");
    });

    it("should return an empty array if the user has no subjects", async () => {
      const response = await request(app)
        .get(`/subjects/user/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${token}`); // Add Authorization header

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});