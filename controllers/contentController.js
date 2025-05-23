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
      const content = await this.model.findById(id);
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
      const updatedContent = await this.model.findByIdAndUpdate(id, body, { new: true });
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
      const deletedContent = await this.model.findByIdAndDelete(id);
      if (!deletedContent) {
        res.status(404).send("Content not found");
      } else {
        res.status(200).send(deletedContent);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async getContentByUserId(userId) {
    try {
      const contents = await this.model.find({ userId });
      return contents;
    } catch (error) {
      throw new Error("Error fetching content by user ID");
    }
  }
  
  
  async getContentByUserIdAndType(userId, contentType) {
    try {
      const contents = await this.model.find({ userId, contentType });
      return contents;
    } catch (error) {
      throw new Error(`Error fetching ${contentType} content by user ID`);
    }
  }

  async getCheckedContent(req, res) {
    try {
      const checkedContent = await this.model.find({ shared: true });

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
}

const contentController = new ContentController();
export default contentController;