import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  userId: {
    type: String,
    required: true,
  },
  resultsId: {
    type: [String],
    default: [],
  },
});

const subjectModel = mongoose.model("Subject", subjectSchema);
export default subjectModel;