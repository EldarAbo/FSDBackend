import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  subjectId: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    required: true,
  },
  time: {
    hour: { type: Number, required: true },
    minute: { type: Number, required: true },
  },
  userId: {
    type: String,
    required: true,
  },
});

const notificationModel = mongoose.model("Notification", notificationSchema);
export default notificationModel;
