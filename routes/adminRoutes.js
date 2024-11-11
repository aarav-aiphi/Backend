import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Agent from '../models/Agent.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Middleware to verify if the user is an admin
const verifyAdmin = async (req, res, next) => {
  const token = req.cookies.token;
 

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token or token verification failed', error: error.message });
  }
};

// Get all accepted agents (admin-only)
router.get('/agents/accepted', verifyAdmin, async (req, res) => {
  try {
    const acceptedAgents = await Agent.find({ status: 'accepted' });
    res.status(200).json(acceptedAgents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch accepted agents', error: error.message });
  }
});

// Get all requested agents (admin-only)
router.get('/agents/requested', verifyAdmin, async (req, res) => {
  try {
    const requestedAgents = await Agent.find({ status: 'requested' });
    res.status(200).json(requestedAgents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requested agents', error: error.message });
  }
});

// Get all rejected agents (admin-only)
router.get('/agents/rejected', verifyAdmin, async (req, res) => {
  try {
    const rejectedAgents = await Agent.find({ status: 'rejected' });
    res.status(200).json(rejectedAgents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch rejected agents', error: error.message });
  }
});

// Get all onHold agents (admin-only)
router.get('/agents/onHold', verifyAdmin, async (req, res) => {
  try {
    const onHoldAgents = await Agent.find({ status: 'onHold' });
    res.status(200).json(onHoldAgents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch onHold agents', error: error.message });
  }
});

// Update the status of an agent (admin-only)
router.put('/agents/:id/status', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, instructions } = req.body;

  try {
    const agent = await Agent.findById(id);
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    agent.status = status;
    await agent.save();

    // Send email if status is onHold
    if (status === 'onHold') {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // use STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        to: agent.ownerEmail,
        from: process.env.EMAIL_USER,
        subject: `Modification Request for Agent: ${agent.name}`,
        text: `Your agent submission has been put on hold. Instructions:\n\n${instructions}`,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log('Error sending email:', error);
          return res.status(500).json({ message: 'Error sending email' });
        } else {
          console.log('Email sent:', info.response);
        }
      });
    }

    res.status(200).json({ message: `Agent status updated to ${status}`, agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update agent status', error });
  }
});
// Update agent details (admin-only)
router.put('/agents/:id/update', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const agent = await Agent.findByIdAndUpdate(id, updateData, { new: true });
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    res.status(200).json({ message: 'Agent updated successfully', agent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update agent details', error });
  }
});


// Delete an agent (admin-only)
router.delete('/agents/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findByIdAndDelete(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.status(200).json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete agent', error: error.message });
  }
});

export default router;
