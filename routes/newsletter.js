// routes/newsletter.js
import express from 'express';
import Subscriber from '../models/Subscriber.js';
import nodemailer from 'nodemailer';
const router = express.Router();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // use false for STARTTLS; true for SSL on port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });


router.get('/subscribers', async (req, res) => {
    try {
      const subscribers = await Subscriber.find({}, 'email');
      res.status(200).json(subscribers);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      res.status(500).json({ message: 'Failed to fetch subscribers', error: error.message });
    }
  });
// Subscribe a new email
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email is already subscribed
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: 'This email is already subscribed.' });
    }

    // Create a new subscriber
    const newSubscriber = new Subscriber({ email });
    await newSubscriber.save();
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender's email address
      to: email, // Recipient's email address
      subject: 'Welcome to AiAzent Newsletter!',
      text: 'Thank you for subscribing to AiAzent Newsletter! Stay tuned for updates.',
      html: '<h1>Welcome to AiAzent Newsletter!</h1><p>Thank you for subscribing to AiAzent Newsletter! Stay tuned for updates.</p>',
  };

  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          console.error('Error sending welcome email:', error);
          return res.status(500).json({ message: 'Failed to send welcome email' });
      }
      console.log('Welcome email sent:', info.response);
  });
    res.status(200).json({ message: 'Successfully subscribed!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to subscribe', error: error.message });
  }
});

router.post('/send', async (req, res) => {
    const { subject, text, html } = req.body;
  
    try {
      const subscribers = await Subscriber.find({}, 'email');
      const recipientEmails = subscribers.map(subscriber => subscriber.email).join(',');
  
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmails,
        subject,
        text,
        html,
      };
  
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log('Error:', error);
          return res.status(500).json({ message: 'Error sending email' });
        } else {
          console.log('Email sent:', info.response);
          res.status(200).json({ message: 'Newsletter sent successfully!' });
        }
      });
    } catch (error) {
      console.error('Error sending newsletter:', error);
      res.status(500).json({ message: 'Failed to send newsletter', error: error.message });
    }
  });
  router.post('/send-test-email', async (req, res) => {
    const { to, subject, text, html } = req.body;

    try {
        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender email address
            to, // Recipient email address (from request body)
            subject: subject || 'Test Email from Nodemailer', // Default subject if not provided
            text: text || 'This is a plain text test email sent using Nodemailer.', // Plain text body
            html: html || '<p>This is a <b>test email</b> sent using Nodemailer!</p>', // HTML body
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);

        res.status(200).json({ message: 'Email sent successfully!', response: info.response });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
});

export default router;
