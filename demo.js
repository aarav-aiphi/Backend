// uploadAgents.js
import mongoose from 'mongoose';
import Agent from './models/Agent.js';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Utility function to clean text by removing \r\n and extra spaces
const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\\r\\n|\\n|\\r/g, ' ').replace(/\s+/g, ' ').trim();
};

// Utility function to split array fields if they contain single strings with commas
const splitArrayField = (fieldArray) => {
  if (!Array.isArray(fieldArray)) return [];

  // Initialize an empty array to hold the processed items
  let processedArray = [];

  fieldArray.forEach(item => {
    if (typeof item === 'string' && item.includes(',')) {
      // Split the string by commas and clean each resulting string
      const splitItems = item.split(',').map(feature => cleanText(feature));
      processedArray = processedArray.concat(splitItems);
    } else if (typeof item === 'string') {
      // Clean the string and add it to the array
      processedArray.push(cleanText(item));
    }
    // If the item is not a string, you can decide how to handle it (e.g., ignore or convert)
  });

  return processedArray;
};

const connectToDatabase = async () => {
  // Replace with your MongoDB connection string
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Function to read and parse JSON data
const readAgentData = async () => {
  try {
    const dataPath = path.join(process.cwd(), 'voice-ai-agents.json'); // Update the filename if necessary
    const rawData = await fs.readFile(dataPath, 'utf-8');
    const data = JSON.parse(rawData);
    return data.pageProps.agents;
  } catch (error) {
    console.error('❌ Error reading or parsing ai-agents-frameworks.json:', error);
    process.exit(1);
  }
};

// Function to transform agent data according to schema
const transformAgentData = (agents) => {
  return agents.map(agent => {
    const pricingModel = cleanText(agent.pricingModel);
    const freeTrial = pricingModel === 'Free' || pricingModel === 'Freemium' ? true : false;
    const status = agent.approved ? 'accepted' : 'rejected';
    const tags = agent.tags ? agent.tags.split(',').map(tag => cleanText(tag)) : [];
    const popularityScore = (agent.upvoters ? agent.upvoters.length : 0) * 1 + (agent.upvotes || 0) * 2 + 0 * 2; // savedByCount = 0

    // Handle keyFeatures
    const keyFeatures = splitArrayField(agent.keyFeatures || []);

    // Handle useCases
    const useCases = splitArrayField(agent.useCases || []);

    return {
      name: cleanText(agent.name),
      createdBy: agent.createdBy ? cleanText(agent.createdBy) : null,
      websiteUrl: cleanText(agent.website),
      ownerEmail: agent.email ? cleanText(agent.email) : null,
      accessModel: cleanText(agent.access),
      pricingModel: pricingModel,
      category: cleanText(agent.category),
      industry: cleanText(agent.industry),
      tagline: agent.shortDescription ? cleanText(agent.shortDescription) : null,
      description: agent.longDescription ? cleanText(agent.longDescription) : null,
      keyFeatures: keyFeatures,
      useCases: useCases,
      popularityScore: popularityScore,
      useRole: null,
      tags: tags,
      logo: cleanText(agent.logo) || null,
      thumbnail: cleanText(agent.image) || null,
      videoUrl: cleanText(agent.video) || null,
      isHiring: false,
      likes: agent.upvotes || 0,
      triedBy: agent.upvoters ? agent.upvoters.length : 0,
      reviewRatings: 0,
      votesThisMonth: agent.upvotes || 0, // Assuming total upvotes as votesThisMonth
      price: cleanText(pricingModel),
      gallery: agent.image ? [cleanText(agent.image)] : [],
      freeTrial: freeTrial,
      subscriptionModel: cleanText(pricingModel),
      status: status,
      savedByCount: 0,
      version: agent.__v || 0,
      featured: agent.featured || false
    };
  });
};

// Function to remove duplicate agents based on 'name'
const removeDuplicates = (agents) => {
  const uniqueAgents = [];
  const names = new Set();
  agents.forEach(agent => {
    if (!names.has(agent.name)) {
      names.add(agent.name);
      uniqueAgents.push(agent);
    }
  });
  return uniqueAgents;
};

// Function to insert agents into MongoDB
const insertAgents = async (agents) => {
  try {
    await Agent.insertMany(agents, { ordered: false }); // ordered: false to continue on errors
    console.log('✅ All agents successfully inserted');
  } catch (error) {
    if (error.name === 'BulkWriteError') {
      console.error('⚠️ Bulk write error:', error.message);
    } else {
      console.error('❌ Error inserting agents:', error);
    }
  }
};

// Main execution function
const main = async () => {
  await connectToDatabase();
  const rawAgents = await readAgentData();
  const transformedAgents = transformAgentData(rawAgents);
  const uniqueAgents = removeDuplicates(transformedAgents);
  // Uncomment the next line to see the transformed agents in the console for debugging
  // console.log(uniqueAgents);
  await insertAgents(uniqueAgents);
  mongoose.connection.close();
};

main();
