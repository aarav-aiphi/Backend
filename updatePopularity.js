// updatePopularity.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Agent from './models/Agent.js'; // Adjust the path if necessary

dotenv.config();

const updatePopularityScores = async () => {
  try {
    await connectDB();

    // Fetch all agents
    const agents = await Agent.find();

    console.log(`Found ${agents.length} agents. Updating popularity scores...`);

    // Iterate through each agent, calculate popularity, and save
    for (const agent of agents) {
      agent.calculatePopularity();
      await agent.save();
      console.log(`Updated popularityScore for Agent: ${agent.name}`);
    }

    console.log('All agents have been updated with the latest popularity scores.');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error updating popularity scores:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

updatePopularityScores();
