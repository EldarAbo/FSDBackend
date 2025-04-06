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
      const result = await this.model.findByIdAndUpdate(id, body, { new: true });
      if (!result) {
        res.status(404).send();
      } else {
        res.status(200).send(result);
      }
    } catch (error) {
      res.status(400).send(error);
    }
  }
}

const usersController = new UsersController();
export default usersController;