import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js'; // Make sure this points to the correct file

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agents',
    allowedFormats: ['jpg', 'jpeg', 'png'], // Only allow these formats
  },
});

const upload = multer({ storage });

export default upload;
