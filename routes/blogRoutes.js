// routes/blogRoutes.js

import express from 'express';
import {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  uploadImage, // Import the new controller function
} from '../controllers/blogController.js';

const router = express.Router();

// Route to get all blogs and create a new blog
router.route('/')
  .get(getBlogs)
  .post(createBlog); // Protected route for admin

// Route to get a single blog, update, and delete a blog
router.route('/:id')
  .get(getBlogById)
  .put(updateBlog) // Protected route for admin
  .delete(deleteBlog); // Protected route for admin

// Route to handle image uploads
router.route('/upload-image')
  .post(uploadImage); // Endpoint for image uploads

export default router;
