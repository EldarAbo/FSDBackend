import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";

class UsersController {
  constructor() {
    this.model = userModel;
  }

  async getById(req, res) {
    const id = req.params.id;
    try {
      const item = await this.model.findById(id);
      if (item != null) {
        res.send(item);
      } else {
        res.status(404).send("not found");
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async create(req, res) {
    try {
      const password = req.body.password;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = {
        ...req.body,
        password: hashedPassword,
      };

      const item = await this.model.create(user);
      res.status(201).send(item);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async deleteItem(req, res) {
    const id = req.params.id;
    try {
      const result = await this.model.findByIdAndDelete(id);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send(error);
    }
  }

  async updateItem(req, res) {
    const id = req.params.id;
    const body = req.body;
    
    try {
      // Validate base64 image if provided
      if (body.imgUrl && body.imgUrl.startsWith('data:image/')) {
        // Basic validation of data URL format
        const dataUrlRegex = /^data:image\/(jpeg|png|gif|webp);base64,/;
        if (!dataUrlRegex.test(body.imgUrl)) {
          return res.status(400).send({ message: 'Invalid image format. Only JPEG, PNG, GIF, and WebP are supported.' });
        }
        
        // Check approximate size (base64 is ~33% larger than original)
        const base64Data = body.imgUrl.split(',')[1];
        const sizeInBytes = (base64Data.length * 3) / 4;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (sizeInBytes > maxSize) {
          return res.status(413).send({ message: 'Image too large. Maximum size is 5MB.' });
        }
      }

      // Make sure we get the updated document back
      const result = await this.model.findByIdAndUpdate(
        id, 
        body, 
        { 
          new: true,           // Return the updated document
          runValidators: true, // Run schema validators
        }
      );
      
      if (!result) {
        return res.status(404).send({ message: 'User not found' });
      }
      
      console.log('User updated successfully:', { 
        id, 
        hasImage: !!result.imgUrl,
        imagePreview: result.imgUrl ? result.imgUrl.substring(0, 50) + '...' : 'none'
      });
      
      res.status(200).send(result);
    } catch (error) {
      console.error('Update error:', error);
      res.status(400).send({ message: error.message || 'Update failed' });
    }
  }
}

const usersController = new UsersController();
export default usersController;