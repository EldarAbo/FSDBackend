import mongoose from "mongoose";

// Note: TypeScript interface removed in JavaScript version

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Only required if not using Google OAuth
    },
  },
  imgUrl: {
    type: String,
    required: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined while maintaining uniqueness
  },
  refreshToken: {
    type: [String],
    default: [],
    required: false,
  },
  twoFactorSecret: {
    type: String, 
    default: null 
  },
  twoFactorEnabled: {
    type: Boolean, 
    default: false
  },
});

const usersModel = mongoose.model("Users", userSchema);

export default usersModel;