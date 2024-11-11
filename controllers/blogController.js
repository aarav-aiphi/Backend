// controllers/blogController.js
// controllers/blogController.js

import Blog from '../models/Blog.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs'; // To handle file system operations

// Helper function to upload a single image to Cloudinary
const uploadImageToCloudinary = (filePath, folder = 'blog_images') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

// @desc    Upload an image
// @route   POST /api/blogs/upload-image
// @access  Public (Adjust access as needed)
export const uploadImage = async (req, res) => {
  try {
    // Check if the image file is present
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const image = req.files.image;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(image.mimetype)) {
      return res.status(400).json({ message: 'Only JPEG, PNG, and GIF images are allowed' });
    }

    // Validate file size (optional)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (image.size > maxSize) {
      return res.status(400).json({ message: 'Image size should not exceed 5MB' });
    }

    // Upload image to Cloudinary
    const result = await uploadImageToCloudinary(image.tempFilePath, 'blog_images');

    // Delete the temporary file after upload
    fs.unlinkSync(image.tempFilePath);

    // Respond with the image URL
    res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Image upload failed. Please try again.' });
  }
};

// ... Existing controller functions (createBlog, getBlogs, etc.)


// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = async (req, res) => {
  try {
    console.log('Received body:', req.body);
    console.log('Received files:', req.files);

    const { title, content, tags, category, sections } = req.body;

    // Parse sections JSON string to an array
    const parsedSections = JSON.parse(sections);

    // Initialize sectionsWithImages array
    const sectionsWithImages = [];

    // Iterate through each section to handle images
    for (let i = 0; i < parsedSections.length; i++) {
      const section = parsedSections[i];
      const { id, title: sectionTitle, content: sectionContent, images: existingImageIds } = section;

      let images = [];

      // Handle existing images (if any) - In creation, likely none
      if (existingImageIds && existingImageIds.length > 0) {
        images = existingImageIds.map(public_id => ({
          public_id,
          url: '', // Since existingImageIds shouldn't exist on creation, this might be empty
        }));
      }

      // Handle new images
      // Files are expected to be named as 'sections[<id>].newImages'
      const fieldName = `sections[${id}].newImages`;
      const sectionNewImages = req.files ? req.files[fieldName] : null;

      if (sectionNewImages) {
        // If only one file is uploaded, wrap it in an array
        const filesArray = Array.isArray(sectionNewImages) ? sectionNewImages : [sectionNewImages];

        // Upload each file to Cloudinary
        const uploadedImages = await Promise.all(
          filesArray.map(async (file) => {
            try {
              const result = await uploadImageFromPath(file.tempFilePath);
              // Delete the temp file after upload
              fs.unlinkSync(file.tempFilePath);
              return {
                public_id: result.public_id,
                url: result.secure_url,
              };
            } catch (uploadError) {
              console.error('Cloudinary upload error:', uploadError);
              throw new Error('Failed to upload section images.');
            }
          })
        );

        images = [...images, ...uploadedImages];
      }

      sectionsWithImages.push({
        title: sectionTitle,
        content: sectionContent,
        images,
      });
    }

    // Handle Main Image
    let mainImageData = {};
    if (req.files && req.files.mainImage) {
      const mainImage = Array.isArray(req.files.mainImage) ? req.files.mainImage[0] : req.files.mainImage;
      try {
        const result = await uploadImageFromPath(mainImage.tempFilePath, 'blog_main_images');
        // Delete the temp file after upload
        fs.unlinkSync(mainImage.tempFilePath);
        mainImageData = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (uploadError) {
        console.error('Cloudinary main image upload error:', uploadError);
        throw new Error('Failed to upload main image.');
      }
    }

    const blog = new Blog({
      title,
      content,
      tags: tags.split(',').map(tag => tag.trim()),
      category,
      sections: sectionsWithImages,
      image: mainImageData, // Assign the main image
    });

    const savedBlog = await blog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all blog posts
// @route   GET /api/blogs
// @access  Public
export const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single blog post
// @route   GET /api/blogs/:id
// @access  Public
export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog by ID:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = async (req, res) => {
  try {
    const { title, content, tags, category, sections } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    // Update basic fields
    blog.title = title || blog.title;
    blog.content = content || blog.content;
    blog.tags = tags ? tags.split(',').map(tag => tag.trim()) : blog.tags;
    blog.category = category || blog.category;

    // Parse sections JSON string to an array
    const parsedSections = JSON.parse(sections);

    // Initialize sectionsWithImages array
    const sectionsWithImages = [];

    // Iterate through each section to handle images
    for (let i = 0; i < parsedSections.length; i++) {
      const section = parsedSections[i];
      const { id, title: sectionTitle, content: sectionContent, images: existingImageIds } = section;

      let images = [];

      // Handle existing images (public_ids)
      if (existingImageIds && existingImageIds.length > 0) {
        images = existingImageIds.map(public_id => ({
          public_id,
          url: '', // Optionally, fetch URL based on public_id or store it
        }));
      }

      // Handle new images
      // Files are expected to be named as 'sections[<id>].newImages'
      const fieldName = `sections[${id}].newImages`;
      const sectionNewImages = req.files ? req.files[fieldName] : null;

      if (sectionNewImages) {
        // If only one file is uploaded, wrap it in an array
        const filesArray = Array.isArray(sectionNewImages) ? sectionNewImages : [sectionNewImages];

        // Upload each file to Cloudinary
        const uploadedImages = await Promise.all(
          filesArray.map(async (file) => {
            try {
              const result = await uploadImageFromPath(file.tempFilePath);
              // Delete the temp file after upload
              fs.unlinkSync(file.tempFilePath);
              return {
                public_id: result.public_id,
                url: result.secure_url,
              };
            } catch (uploadError) {
              console.error('Cloudinary upload error:', uploadError);
              throw new Error('Failed to upload section images.');
            }
          })
        );

        images = [...images, ...uploadedImages];
      }

      sectionsWithImages.push({
        title: sectionTitle,
        content: sectionContent,
        images,
      });
    }

    // Handle Main Image
    if (req.files && req.files.mainImage) {
      const mainImage = Array.isArray(req.files.mainImage) ? req.files.mainImage[0] : req.files.mainImage;
      try {
        const result = await uploadImageFromPath(mainImage.tempFilePath, 'blog_main_images');
        // Delete the temp file after upload
        fs.unlinkSync(mainImage.tempFilePath);
        blog.image = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } catch (uploadError) {
        console.error('Cloudinary main image upload error:', uploadError);
        throw new Error('Failed to upload main image.');
      }
    }

    // Update sections
    blog.sections = sectionsWithImages;

    const updatedBlog = await blog.save();
    res.json(updatedBlog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    // Delete all section images from Cloudinary
    for (const section of blog.sections) {
      for (const image of section.images) {
        if (image.public_id) {
          await cloudinary.uploader.destroy(image.public_id);
        }
      }
    }

    // Delete main image from Cloudinary
    if (blog.image && blog.image.public_id) {
      await cloudinary.uploader.destroy(blog.image.public_id);
    }

    await blog.remove();
    res.json({ message: 'Blog removed' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: error.message });
  }
};
