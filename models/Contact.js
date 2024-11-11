// Backend/models/Contact.js

import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add your email'],
     
    },
    message: {
      type: String,
      required: [true, 'Please add a message'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;