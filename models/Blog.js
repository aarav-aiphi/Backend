// models/Blog.js

import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  public_id: {
    type: String,
  },
  url: {
    type: String,
  },
});

const SectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a section title'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'Please add section content'],
  },
  images: [ImageSchema], // Array of images for the section
});

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please add content'],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
    },
    sections: [SectionSchema], // Array of sections
    image: ImageSchema, // Main image
    // Removed 'author' field as per your setup
  },
  { timestamps: true }
);

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
