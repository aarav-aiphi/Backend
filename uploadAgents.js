import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import Agent from './models/Agent.js';  // Make sure you have the Agent model defined

dotenv.config();  // Load environment variables from .env file

// Connect to the database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Database connected'))
  .catch((error) => console.error('Database connection error:', error));

// Function to upload agents from JSON file
const uploadAgents = async () => {
  try {
    // Read the agentschema.json file (you already have this)
    const data = fs.readFileSync('./agents.json', 'utf-8');
    const agents = JSON.parse(data);

    // Insert agents into the database
    const result = await Agent.insertMany(agents);
    console.log('Agents uploaded successfully:', result);
    
    mongoose.connection.close();  // Close the connection after uploading
  } catch (error) {
    console.error('Error uploading agents:', error);
    mongoose.connection.close();
  }
};

// Run the function to upload agents
uploadAgents();
