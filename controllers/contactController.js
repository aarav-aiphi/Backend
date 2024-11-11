// Backend/controllers/contactController.js

import Contact from '../models/Contact.js';

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create contact entry
    const contact = await Contact.create({
      name,
      email,
      message,
    });

    res.status(201).json({
      message: 'Your message has been received. We will contact you shortly.',
      contact,
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};