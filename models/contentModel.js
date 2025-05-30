import mongoose from "mongoose";

const contentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,  // HTML content
    required: true
  },
  subject: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: "Untitled Title"
  },
  contentType: {
    type: String,
    enum: ["Summary", "Exam"],
    required: true
  },
  shared:{
    type: Boolean,
    default: false
  },
  copyContent:{
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual properties for creation date and time
contentSchema.virtual('creationDate').get(function() {
  return this.createdAt.toISOString().split('T')[0];
});

contentSchema.virtual('creationTime').get(function() {
  return this.createdAt.toISOString().split('T')[1].substring(0, 8);
});

// Ensure virtual fields are included when converting to JSON
contentSchema.set('toJSON', { virtuals: true });
contentSchema.set('toObject', { virtuals: true });

const contentModel = mongoose.model("Content", contentSchema);
export default contentModel;