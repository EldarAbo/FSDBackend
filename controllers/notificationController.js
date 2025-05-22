import Notification from "../models/notificationModel.js";

class notificationController {
  async createNotification(req, res) {
    try {
      const notification = await Notification.create(req.body);
      res.status(201).json(notification);
    } catch (err) {
      res.status(400).json({ error: "Failed to create notification" });
    }
  }

  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      await Notification.findByIdAndDelete(id);
      res.status(200).json({ message: "Notification deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete notification" });
    }
  }

  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const notifications = await Notification.find({ userId });
      res.status(200).json(notifications);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  }
}

export default notificationController;