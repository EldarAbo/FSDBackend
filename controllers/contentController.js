import contentModel from "../models/contentModel.js";
import userModel from "../models/userModel.js";
import { promises as fsPromises } from 'fs';

class ContentController {
  constructor() {
    this.model = contentModel;
  }

  async getById(req, res) {
    const id = req.params.id;
    try {
      // Only get non-deleted content
      const content = await this.model.findOne({ _id: id, deleted: { $ne: true } });
      if (content) {
        res.status(200).send(content);
      } else {
        res.status(404).send("Content not found");
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async create(req, res) {
    try {
      const { userId, content, subject, title, contentType, copyContent, shared } = req.body;
      if (!userId || !content || !contentType) {
        return res.status(400).send("Missing required fields: userId, content, and contentType are required");
      }
      
      // Validate contentType
      if (!["Summary", "Exam"].includes(contentType)) {
        return res.status(400).send("contentType must be either 'Summary' or 'Exam'");
      }

      const newContent = await this.model.create({ 
        userId, 
        content, 
        subject,
        title: title || "Untitled", 
        contentType,
        shared,
        copyContent 
      });
      
      res.status(201).send(newContent);
    } catch (error) {
      res.status(400).send(error.message);
    }
  }

  async updateItem(req, res) {
    const id = req.params.id;
    const body = req.body;
    try {
      // Only update non-deleted content
      const updatedContent = await this.model.findOneAndUpdate(
        { _id: id, deleted: { $ne: true } }, 
        body, 
        { new: true }
      );
      if (!updatedContent) {
        res.status(404).send("Content not found");
      } else {
        res.status(200).send(updatedContent);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async deleteItem(req, res) {
    const id = req.params.id;
    try {
      // Soft delete: set deleted flag to true and deletedAt timestamp
      const deletedContent = await this.model.findOneAndUpdate(
        { _id: id, deleted: { $ne: true } },
        { 
          deleted: true, 
          deletedAt: new Date() 
        },
        { new: true }
      );
      
      if (!deletedContent) {
        res.status(404).send("Content not found");
      } else {
        res.status(200).send({ message: "Content deleted successfully", id: deletedContent._id });
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  // New method to permanently delete content (optional, for admin use)
  async permanentlyDeleteItem(req, res) {
    const id = req.params.id;
    try {
      const deletedContent = await this.model.findByIdAndDelete(id);
      if (!deletedContent) {
        res.status(404).send("Content not found");
      } else {
        res.status(200).send({ message: "Content permanently deleted", id: deletedContent._id });
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  // New method to restore soft-deleted content
  async restoreItem(req, res) {
    const id = req.params.id;
    try {
      const restoredContent = await this.model.findOneAndUpdate(
        { _id: id, deleted: true },
        { 
          deleted: false, 
          deletedAt: null 
        },
        { new: true }
      );
      
      if (!restoredContent) {
        res.status(404).send("Deleted content not found");
      } else {
        res.status(200).send(restoredContent);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async getContentByUserId(userId) {
    try {
      // Only return non-deleted content
      const contents = await this.model.find({ userId, deleted: { $ne: true } });
      return contents;
    } catch (error) {
      throw new Error("Error fetching content by user ID");
    }
  }
  
  async getContentByUserIdAndType(userId, contentType) {
    try {
      // Only return non-deleted content
      const contents = await this.model.find({ 
        userId, 
        contentType, 
        deleted: { $ne: true } 
      });
      return contents;
    } catch (error) {
      throw new Error(`Error fetching ${contentType} content by user ID`);
    }
  }

  async getCheckedContent(req, res) {
    try {
      // Only return non-deleted shared content
      const checkedContent = await this.model.find({ 
        shared: true, 
        deleted: { $ne: true } 
      });

      const contentWithUser = await Promise.all(
        checkedContent.map(async (content) => {
          const user = await userModel.findById(content.userId).select("username fullName imgUrl"); 
          return {
            ...content.toObject(),
            user,
          };
        })
      );

      res.status(200).json(contentWithUser);
    } catch (error) {
      console.error("Error fetching checked content:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // New method to get deleted content (for admin or recovery purposes)
  async getDeletedContent(req, res) {
    try {
      const { userId } = req.params;
      const deletedContent = await this.model.find({ 
        userId, 
        deleted: true 
      }).sort({ deletedAt: -1 });
      
      res.status(200).json(deletedContent);
    } catch (error) {
      console.error("Error fetching deleted content:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

const contentController = new ContentController();
export default contentController;