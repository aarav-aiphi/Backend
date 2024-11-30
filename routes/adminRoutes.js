import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import Agent from '../models/Agent.js';
import nodemailer from 'nodemailer';
import cloudinary from '../config/cloudinary.js';
import { parse } from 'csv-parse/sync';
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
    const agent=await Agent.findByIdAndDelete(id);
    if(!agent){
      return res.status(404).json({message:'Agent not found'});
    }
    res.status(200).json({message:'Agent deleted successfully'});
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
      const agents = [];
      const invalidAgents = [];

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

          // Convert fields to appropriate data types with safe checks
       
          const likes = Number(trimmedRecord.likes) || 0;
          const triedBy = Number(trimmedRecord.triedBy) || 0;
          const reviewRatings = Number(trimmedRecord.reviewRatings) || 0;
          const votesThisMonth = Number(trimmedRecord.votesThisMonth) || 0;
          const savedByCount = Number(trimmedRecord.savedByCount) || 0;
          const isHiring = typeof trimmedRecord.isHiring === 'string' ? trimmedRecord.isHiring.toLowerCase() === 'true' : false;
          const freeTrial = typeof trimmedRecord.freeTrial === 'string' ? trimmedRecord.freeTrial.toLowerCase() === 'true' : false;

          // Basic validation: Check required fields and data types
          const requiredFields = ['name', 'websiteUrl', 'accessModel', 'pricingModel', 'category', 'industry'];
          const hasAllRequiredFields = requiredFields.every(field => trimmedRecord[field]);

       
          const isLikesValid = !isNaN(likes);
          const isTriedByValid = !isNaN(triedBy);
          const isReviewRatingsValid = !isNaN(reviewRatings);
          const isVotesThisMonthValid = !isNaN(votesThisMonth);
          const isSavedByCountValid = !isNaN(savedByCount);

          // Additional format checks for email and URL
          

          let formatErrors = [];
       
          if (
              hasAllRequiredFields &&
             
              isLikesValid &&
              isTriedByValid &&
              isReviewRatingsValid &&
              isVotesThisMonthValid &&
              isSavedByCountValid 
          ) {
              // Map CSV columns to Agent schema fields with proper data type conversions
              const agent = {
                  name: trimmedRecord.name,
                  createdBy: trimmedRecord.createdBy || 'Unknown', // Default value if not provided
                  websiteUrl: trimmedRecord.websiteUrl,
                  contactEmail: trimmedRecord.contactEmail || null,
                  accessModel: trimmedRecord.accessModel,
                  pricingModel: trimmedRecord.pricingModel,
                  category: trimmedRecord.category,
                  industry: trimmedRecord.industry,
                  tagline: trimmedRecord.tagline || '',
                  description: trimmedRecord.description || '',
                  shortDescription: trimmedRecord.shortDescription || '',
                  keyFeatures: trimmedRecord.keyFeatures ? trimmedRecord.keyFeatures.split('|').map(f => f.trim()) : [],
                  useCases: trimmedRecord.useCases ? trimmedRecord.useCases.split('|').map(u => u.trim()) : [],
                  useRole: trimmedRecord.useRole || '',
                  tags: trimmedRecord.tags ? trimmedRecord.tags.split('|').map(t => t.trim()) : [],
                  logo: trimmedRecord.logo || '',
                  thumbnail: trimmedRecord.thumbnail || '',
                  videoUrl: trimmedRecord.videoUrl || '',
                  isHiring: isHiring,
                  likes: likes,
                  triedBy: triedBy,
                  reviewRatings: reviewRatings,
                  votesThisMonth: votesThisMonth,
                  integrationSupport: trimmedRecord.integrationSupport || 'None',
                  price: price,
                  gallery: trimmedRecord.gallery ? trimmedRecord.gallery.split('|').map(g => g.trim()) : [],
                  individualPlan: trimmedRecord.individualPlan || '',
                  enterprisePlan: trimmedRecord.enterprisePlan || '',
                  freeTrial: freeTrial,
                  subscriptionModel: trimmedRecord.subscriptionModel || '',
                  refundPolicy: trimmedRecord.refundPolicy || '',
                  companyResources: {
                      website: trimmedRecord.companyResourceWebsite || '',
                      otherResources: trimmedRecord.otherResources ? trimmedRecord.otherResources.split('|').map(r => r.trim()) : [],
                  },
                  status: trimmedRecord.status || 'requested',
                  savedByCount: savedByCount,
                  ownerEmail: trimmedRecord.ownerEmail || '',
              };

              agents.push(agent);
          } else {
              // Collect validation errors with detailed reasons
              const reasons = [];

              if (!hasAllRequiredFields) reasons.push('Missing required fields.');
          
              if (!isLikesValid) reasons.push('Likes must be a valid number.');
              if (!isTriedByValid) reasons.push('TriedBy must be a valid number.');
              if (!isReviewRatingsValid) reasons.push('ReviewRatings must be a valid number.');
              if (!isVotesThisMonthValid) reasons.push('VotesThisMonth must be a valid number.');
              if (!isSavedByCountValid) reasons.push('SavedByCount must be a valid number.');
              if (formatErrors.length > 0) reasons.push(...formatErrors);

              invalidAgents.push({ row: index + 2, reasons: reasons }); // +2 to account for header and zero-index
          }
      });

      console.log('Valid Agents:', agents);
      console.log('Invalid Agents:', invalidAgents);

      if (agents.length === 0) {
          return res.status(400).json({ message: 'No valid agent data found in CSV.', failed: invalidAgents });
      }

      // Insert agents into the database
      let insertedAgents;
      console.log(agents);
      try {
          insertedAgents = await Agent.insertMany(agents, { ordered: false });
          console.log('Inserted Agents:', insertedAgents);
      } catch (insertError) {
          console.error('InsertMany Error:', insertError);
          if (insertError.name === 'BulkWriteError') {
              return res.status(400).json({ message: 'Bulk write error.', details: insertError.message });
          }
          throw insertError; // Let the outer catch handle other errors
      }

      console.log('Number of inserted agents:', insertedAgents.length);

      res.status(201).json({
          message: `${insertedAgents.length} agents uploaded successfully.`,
          inserted: insertedAgents,
          failed: invalidAgents,
      });
  } catch (error) {
      console.error('Bulk CSV upload error:', error);
      // Handle duplicate key errors or validation errors
      if (error.name === 'BulkWriteError') {
          return res.status(400).json({ message: 'Bulk write error.', details: error.message });
      }
      res.status(500).json({ message: 'Server error during bulk CSV upload.' });
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
      price,
      ownerEmail,
      tagline,
      description,
      keyFeatures,
      useCases,
      tags,
      videoUrl,
      individualPlan,
      enterprisePlan,
      subscriptionModel,
      refundPolicy,
    } = req.body;

    // Handle logo upload if provided
    if (req.files && req.files.logo) {
      if (agent.logo) {
        const publicId = agent.logo.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`agents/${publicId}`);
      }
      const logo = await cloudinary.uploader.upload(req.files.logo.tempFilePath, {
        folder: 'agents',
      });
      agent.logo = logo.secure_url;
    }

    // Handle thumbnail upload if provided
    if (req.files && req.files.thumbnail) {
      if (agent.thumbnail) {
        const publicId = agent.thumbnail.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`agents/${publicId}`);
      }
      const thumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
        folder: 'agents',
      });
      agent.thumbnail = thumbnail.secure_url;
    }

    // Update other fields
    if (name) agent.name = name;
    if (createdBy) agent.createdBy = createdBy;
    if (websiteUrl) agent.websiteUrl = websiteUrl;
    if (accessModel) agent.accessModel = accessModel;
    if (pricingModel) agent.pricingModel = pricingModel;
    if (category) agent.category = category;
    if (industry) agent.industry = industry;
    if (price) agent.price = price;
    if (ownerEmail) agent.ownerEmail = ownerEmail;
    if (tagline) agent.tagline = tagline;
    if (description) agent.description = description;

    // Convert comma-separated strings or arrays to arrays
    agent.keyFeatures = Array.isArray(keyFeatures)
      ? keyFeatures
      : keyFeatures?.split(',').map((item) => item.trim()) || [];
    agent.useCases = Array.isArray(useCases)
      ? useCases
      : useCases?.split(',').map((item) => item.trim()) || [];
    agent.tags = Array.isArray(tags)
      ? tags
      : tags?.split(',').map((item) => item.trim()) || [];

    if (videoUrl) agent.videoUrl = videoUrl;
    if (individualPlan) agent.individualPlan = individualPlan;
    if (enterprisePlan) agent.enterprisePlan = enterprisePlan;
    if (subscriptionModel) agent.subscriptionModel = subscriptionModel;
    if (refundPolicy) agent.refundPolicy = refundPolicy;

    // Save the updated agent
    await agent.save();

    res.status(200).json({ message: 'Agent updated successfully', agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ message: 'Failed to update agent', error: error.message });
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
