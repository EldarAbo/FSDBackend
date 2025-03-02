import usersModel from "../models/usersModel.js";

const getAllUsers = async (req, res) => {
  const filter = req.query.username;
  console.log("reached getallusers");
  try {
    let users;
    if (filter) {
      users = await usersModel.find({ username: filter });
    } else {
      users = await usersModel.find();
    }
    
    // Always return an array even if empty
    res.send(users);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const getUserByUsername = async (req, res) => {
  const username = req.params.username;

  try {
    const user = await usersModel.findOne({ username: username });
    if (user) {
      res.send(user);
    } else {
      res.status(404).send("user not found");
    }
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const getUserByUserId = async (req, res) => {
  const userId = req.params._id;

  try {
    const user = await usersModel.findOne({ _id: userId });
    if (user) {
      res.send(user);
    } else {
      res.status(404).send("user not found");
    }
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const createAUser = async (req, res) => {
  const userBody = req.body;
  console.log('User creation reached', req.body);
  try {
    const user = await usersModel.create(userBody);
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const updateUserEmailByUsername = async (req, res) => {
  const username = req.params.username;
  const userBody = req.body;
  try {
    const user = await usersModel.findOne({ username: username });
    if (!user) {
      return res.status(404).send("user not found");
    }
    
    const result = await usersModel.updateOne({ username: username }, { $set: { email: userBody.content } });
    res.send(result);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const deleteUserByUsername = async (req, res) => {
  const username = req.params.username;
  try {
    const user = await usersModel.findOne({ username: username });
    if (!user) {
      return res.status(404).send("user not found");
    }
    
    const result = await usersModel.deleteOne({ username: username });
    res.send(result);
  } catch (error) {
    res.status(400).send(error.message);
  }
};

const updateUserImageByUsername = async (req, res) => {
  console.log('Reached image update');
  const user = req.body;
  const userId = user.id;
  const port = process.env.PORT;

  try {
    // If there's a file, upload it using the file route
    if (req.file) {
      console.log('reached file creation');
      
      // Create form data for file upload
      const formData = new FormData();
      const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('file', fileBlob, req.file.originalname);

      // Make request to your file upload endpoint
      const response = await fetch(process.env.BASE_URL + `:${port}/storage?imgId=${userId}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const fileData = await response.json();
      
      // Update post with file URL
      if (fileData.url) {
        const finalUrl = process.env.BASE_URL + `:${port}/storage/${userId}` + '/' + fileData.url.split('/').pop();
        console.log("photo file url", finalUrl);
        user.imgUrl = finalUrl;
        console.log("User file url", user.imgUrl);
        await usersModel.updateOne({ username: user.username }, { $set: { imgUrl: finalUrl } });
      }
      // Return the complete updated post
      res.status(201).json({ status: 201, message: 'Image updated successfully' });
    } else {
      // Handle case when no file is provided
      res.status(400).send("No file provided");
    }
  } catch (error) {
    res.status(400).send(error.message);
  }
};

export default {
  getAllUsers,
  createAUser,
  updateUserEmailByUsername,
  getUserByUsername,
  deleteUserByUsername,
  updateUserImageByUsername,
  getUserByUserId,
};