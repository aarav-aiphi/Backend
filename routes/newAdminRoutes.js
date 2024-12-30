import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Agent from '../models/Agent.js';
import nodemailer from 'nodemailer';
import cloudinary from '../config/cloudinary.js';
import { parse } from 'csv-parse/sync';
import PendingChange from '../models/PendingChange.js';
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
   req.user=user;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
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
router.delete('/agents/:id',verifyAdmin,async(req,res)=>{
  const {id}=req.params;

  try{
    

      // Create a PendingChange entry
      const pendingChange = new PendingChange({
        action: 'delete',
        collection: 'agents',
        documentId: id,
        requestedBy: req.user._id, // Assuming req.user is populated via authentication middleware
      });
  
      await pendingChange.save();

      res.status(200).json({ message: 'Agent deletion request submitted for approval.' });
  }catch(error){
    res.status(500).json({message:'Failed to delete agent',error:error.message});
  }
})

router.post('/bulk-upload-csv', verifyAdmin, async (req, res) => {
    try {
      const { csv } = req.body;
  
      console.log('Received bulk upload request');
      console.log('CSV Data:', csv); // Debugging: Verify CSV data is received
  
      if (!csv) {
        return res.status(400).json({ message: 'No CSV data provided.' });
      }
  
      // Parse CSV data
      const records = parse(csv, {
        columns: true, // Treat the first row as headers
        skip_empty_lines: true,
        trim: true,
        delimiter: ',', // Ensure the CSV is comma-separated
      });
  
      console.log('Parsed Records:', records); // Debugging: Verify records are parsed correctly
  
      // Validate and transform records
      const pendingChanges = [];
      const invalidRecords = [];
  
      records.forEach((record, index) => {
        // Trim all string fields to remove unnecessary whitespace
        const trimmedRecord = {};
        for (const key in record) {
          if (typeof record[key] === 'string') {
            trimmedRecord[key] = record[key].trim();
          } else {
            trimmedRecord[key] = record[key];
          }
        }
  
        // Basic validation: Check required fields and data types
        const requiredFields = ['name', 'websiteUrl', 'accessModel', 'pricingModel', 'category', 'industry'];
        const hasAllRequiredFields = requiredFields.every(field => trimmedRecord[field]);
  
        if (hasAllRequiredFields) {
          // Create a PendingChange entry for each agent
          const pendingChange = {
            action: 'create',
            collection: 'agents',
            newData: trimmedRecord,
            requestedBy: req.user._id,
          };
          pendingChanges.push(pendingChange);
        } else {
          // Collect validation errors
          invalidRecords.push({ row: index + 2, message: 'Missing required fields.' }); // +2 to account for header and zero-index
        }
      });
  
      console.log('Pending Changes:', pendingChanges);
      console.log('Invalid Records:', invalidRecords);
  
      if (pendingChanges.length === 0) {
        return res.status(400).json({ message: 'No valid agent data found in CSV.', failed: invalidRecords });
      }
  
      // Insert PendingChange documents into the database
      try {
        await PendingChange.insertMany(pendingChanges, { ordered: false });
      } catch (insertError) {
        console.error('InsertMany Error:', insertError);
        return res.status(400).json({ message: 'Bulk write error.', details: insertError.message });
      }
  
      console.log('Number of pending changes created:', pendingChanges.length);
  
      res.status(201).json({
        message: `${pendingChanges.length} agents upload requests submitted for approval.`,
        failed: invalidRecords,
      });
    } catch (error) {
      console.error('Bulk CSV upload error:', error);
      res.status(500).json({ message: 'Server error during bulk CSV upload.', error: error.message });
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
    
    // Fetch the existing agent to ensure it exists
    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

   

    // Prepare the data for the status change
    const newData = {
      status,
      instructions: status === 'onHold' ? instructions : undefined, // Include instructions only if status is 'onHold'
    };

    // Remove undefined fields
    Object.keys(newData).forEach(
      (key) => newData[key] === undefined && delete newData[key]
    );

    // Create a PendingChange entry with action 'status_change'
    const pendingChange = new PendingChange({
      action: 'status_change',
      collection: 'agents',
      documentId: id,
      newData: newData,
      requestedBy: req.user._id, // Assuming req.user is populated via authentication middleware
    });

    await pendingChange.save();

    // Optionally, notify superadmins about the new pending change here

    res.status(200).json({ message: `Agent status change request submitted for approval.` });
  } catch (error) {
    console.error('Failed to submit agent status change request:', error);
    res.status(500).json({ message: 'Failed to submit agent status change request.', error: error.message });
  }
});

// Update agent details (admin-only)
router.put('/update/:id',verifyAdmin, async (req, res) => {
  try {
    const agentId = req.params.id;

    // Fetch the existing agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const {
      name,
      createdBy,
      websiteUrl,
      accessModel,
      pricingModel,
      category,
      industry,
      ownerEmail,
      tagline,
      description,
      keyFeatures,
      useCases,
      tags,
      videoUrl
    } = req.body;



    let newData = {
        name,
        createdBy,
        websiteUrl,
        accessModel,
        pricingModel,
        category,
        industry,
        ownerEmail,
        tagline,
        description,
        keyFeatures,
        useCases,
        tags,
        videoUrl
      };

      // Handle logo upload if provided
      if (req.files && req.files.logo) {
        // Upload to a temporary folder in Cloudinary
        const logoUpload = await cloudinary.uploader.upload(req.files.logo.tempFilePath, {
          folder: 'agents/temp',
        });
  
        // Store the temporary logo URL and public ID in newData
        newData.logoTempUrl = logoUpload.secure_url;
        newData.logoTempPublicId = logoUpload.public_id;
      }

    // Handle thumbnail upload if provided
    if (req.files && req.files.thumbnail) {
        // Upload to a temporary folder in Cloudinary
        const thumbnailUpload = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
          folder: 'agents/temp',
        });
  
        // Store the temporary thumbnail URL and public ID in newData
        newData.thumbnailTempUrl = thumbnailUpload.secure_url;
        newData.thumbnailTempPublicId = thumbnailUpload.public_id;
      }

      Object.keys(newData).forEach(
        (key) => (newData[key] === undefined || newData[key] === null) && delete newData[key]
      );

   // Create a PendingChange entry with action 'update'
   const pendingChange = new PendingChange({
    action: 'update',
    collection: 'agents',
    documentId: agentId,
    newData: newData,
    requestedBy: req.user._id, // Assuming req.user is populated via authentication middleware
  });

  await pendingChange.save();

  res.status(200).json({
    message: 'Agent update request submitted for superadmin approval.',
    pendingChangeId: pendingChange._id, // Optionally return the PendingChange ID
  });
} catch (error) {
  console.error('Error submitting agent update request:', error);
  res.status(500).json({
    message: 'Failed to submit agent update request.',
    error: error.message,
  });
}
});

router.get('/myrequests', verifyAdmin, async (req, res) => {
  try {
    // Look for changes where requestedBy = current admin user ID
    const myPendingChanges = await PendingChange.find({
      requestedBy: req.user._id,
    }).populate({
      path: 'documentId', // Populate the documentId with the Agent details
      model: 'Agent', // Specify the model to populate from
    })
      .sort({ createdAt: -1 })
      .exec();

    if (!myPendingChanges.length) {
      return res
        .status(404)
        .json({ message: 'No requests found for the current admin.' });
    }

    return res.status(200).json(myPendingChanges);
  } catch (error) {
    console.error('Error fetching admin requests:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
