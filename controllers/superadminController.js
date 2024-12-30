// controllers/superadminController.js
import PendingChange from '../models/PendingChange.js';
import Agent from '../models/Agent.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';
import nodemailer from 'nodemailer';

// Utility function to send emails
const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Use your email provider's SMTP settings
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

// Controller to fetch all pending changes
export const getAllPendingChanges = async (req, res) => {
  try {
    const pendingChanges = await PendingChange.find({ status: 'pending' })
      .populate('requestedBy', 'username email')
      .populate({
        path: 'documentId', // Populate the documentId with the Agent details
        model: 'Agent', // Specify the model to populate from
      })

      .sort({ createdAt: -1 }); // Latest first

    res.status(200).json(pendingChanges);
  } catch (error) {
    console.error('Error fetching pending changes:', error);
    res.status(500).json({ message: 'Failed to fetch pending changes', error: error.message });
  }
};

// Controller to approve a pending change
export const approveChange = async (req, res) => {
  const { changeId } = req.params;
  const superadminId = req.user._id;

  try {
    const pendingChange = await PendingChange.findById(changeId).populate('requestedBy', 'username email');
    if (!pendingChange || pendingChange.status !== 'pending') {
      return res.status(404).json({ message: 'Pending change not found or already processed' });
    }

    // Handle based on action type
    let updatedAgent;
    if (pendingChange.collection === 'agents') {
      const { action, newData, documentId } = pendingChange;

      if (action === 'create') {
        // Handle file uploads
        if (newData.logoTempUrl && newData.logoTempPublicId) {
          const logoUpload = await cloudinary.uploader.upload(newData.logoTempUrl, {
            folder: 'agents',
            public_id: `agents/${newData.name}/logo`, // Customize as needed
            overwrite: true,
          });
          newData.logo = logoUpload.secure_url;

          // Delete temporary file
          await cloudinary.uploader.destroy(newData.logoTempPublicId);
          delete newData.logoTempUrl;
          delete newData.logoTempPublicId;
        }

        if (newData.thumbnailTempUrl && newData.thumbnailTempPublicId) {
          const thumbnailUpload = await cloudinary.uploader.upload(newData.thumbnailTempUrl, {
            folder: 'agents',
            public_id: `agents/${newData.name}/thumbnail`, // Customize as needed
            overwrite: true,
          });
          newData.thumbnail = thumbnailUpload.secure_url;

          // Delete temporary file
          await cloudinary.uploader.destroy(newData.thumbnailTempPublicId);
          delete newData.thumbnailTempUrl;
          delete newData.thumbnailTempPublicId;
        }

        // Create the Agent
        updatedAgent = await Agent.create(newData);
      } else if (action === 'update' || action==='status_change') {
        // Handle file uploads
        if (newData.logoTempUrl && newData.logoTempPublicId) {
          const logoUpload = await cloudinary.uploader.upload(newData.logoTempUrl, {
            folder: 'agents',
            public_id: `agents/${documentId}/logo`, // Customize as needed
            overwrite: true,
          });
          newData.logo = logoUpload.secure_url;

          // Delete temporary file
          await cloudinary.uploader.destroy(newData.logoTempPublicId);
          delete newData.logoTempUrl;
          delete newData.logoTempPublicId;
        }

        if (newData.thumbnailTempUrl && newData.thumbnailTempPublicId) {
          const thumbnailUpload = await cloudinary.uploader.upload(newData.thumbnailTempUrl, {
            folder: 'agents',
            public_id: `agents/${documentId}/thumbnail`, // Customize as needed
            overwrite: true,
          });
          newData.thumbnail = thumbnailUpload.secure_url;

          // Delete temporary file
          await cloudinary.uploader.destroy(newData.thumbnailTempPublicId);
          delete newData.thumbnailTempUrl;
          delete newData.thumbnailTempPublicId;
        }

        // Update the Agent
        updatedAgent = await Agent.findByIdAndUpdate(documentId, newData, { new: true, runValidators: true });
      } else if (action === 'delete') {
        // Delete the Agent
        updatedAgent = await Agent.findByIdAndDelete(documentId);
      }
    } else {
      return res.status(400).json({ message: 'Unsupported collection type' });
    }

    // Update the PendingChange status
    pendingChange.status = 'approved';
    pendingChange.reviewedBy = superadminId;
    pendingChange.reviewedAt = new Date();
    await pendingChange.save();

    // Notify the admin who requested the change
    const adminEmail = pendingChange.requestedBy.email;
    const adminUsername = pendingChange.requestedBy.username;
    const subject = 'Your Change Request has been Approved';
    let text = `Hello ${adminUsername},\n\nYour request to ${pendingChange.action} an agent has been approved.\n\nThank you.`;

    await sendEmail(adminEmail, subject, text);

    res.status(200).json({ message: 'Change approved and applied successfully', agent: updatedAgent });
  } catch (error) {
    console.error('Error approving change:', error);
    res.status(500).json({ message: 'Failed to approve change', error: error.message });
  }
};

// Controller to reject a pending change
export const rejectChange = async (req, res) => {
  const { changeId } = req.params;
  const { reason } = req.body; // Reason for rejection
  const superadminId = req.user._id;

  try {
    const pendingChange = await PendingChange.findById(changeId).populate('requestedBy', 'username email');
    if (!pendingChange || pendingChange.status !== 'pending') {
      return res.status(404).json({ message: 'Pending change not found or already processed' });
    }

    // If there are temporary files, delete them
    if (pendingChange.newData) {
      if (pendingChange.newData.logoTempPublicId) {
        await cloudinary.uploader.destroy(pendingChange.newData.logoTempPublicId);
      }
      if (pendingChange.newData.thumbnailTempPublicId) {
        await cloudinary.uploader.destroy(pendingChange.newData.thumbnailTempPublicId);
      }
    }

    // Update the PendingChange status
    pendingChange.status = 'rejected';
    pendingChange.reviewedBy = superadminId;
    pendingChange.reviewedAt = new Date();
    pendingChange.rejectionReason = reason || 'No reason provided';
    await pendingChange.save();

    // Notify the admin who requested the change
    const adminEmail = pendingChange.requestedBy.email;
    const adminUsername = pendingChange.requestedBy.username;
    const subject = 'Your Change Request has been Rejected';
    let text = `Hello ${adminUsername},\n\nYour request to ${pendingChange.action} an agent has been rejected.\n\nReason: ${reason || 'No reason provided.'}\n\nPlease review and try again.\n\nThank you.`;

    await sendEmail(adminEmail, subject, text);

    res.status(200).json({ message: 'Change request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting change:', error);
    res.status(500).json({ message: 'Failed to reject change', error: error.message });
  }
};
