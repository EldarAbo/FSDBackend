import cron from "node-cron";
import Notification from "../models/notificationModel.js";
import Subject from "../models/subjectModel.js";
import User from "../models/userModel.js"; // ✅ נוספו
import { sendReminderEmail } from "./send.js";
import dotenv from "dotenv";
dotenv.config();

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });
  const hour = now.getHours();
  const minute = now.getMinutes();

  const notifications = await Notification.find({
    day: currentDay,
    "time.hour": hour,
    "time.minute": minute,
  });

  for (const notif of notifications) {    
    const subject = await Subject.findById(notif.subjectId);
    if (!subject) continue;

    const user = await User.findById(notif.userId); // ✅ שליפת היוזר מה-DB
    if (!user || !user.email) continue;
    
    const userEmail = user.email;
    const studentName = user.fullName || user.username || "תלמיד";

    try {
      await sendReminderEmail(userEmail, studentName, subject.title);
      console.log(`Sent email to ${userEmail} for subject ${subject.title}`);
    } catch (err) {
      console.error("Error sending email", err);
    }
  }
});
