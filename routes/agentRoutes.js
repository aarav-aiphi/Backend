import express from 'express';
import cloudinary from '../config/cloudinary.js';
import Agent from '../models/Agent.js';

const router = express.Router();

router.get('/all', async (req, res) => {
  try {
    const agents = await Agent.find();  // Fetch all agents
    res.status(200).json(agents);  // Send the agents in the response
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Failed to fetch agents', error: error.message });
  }
});
router.get('/filters', async (req, res) => {
  try {
    const categories = await Agent.distinct('category', { status: 'accepted' });
    const industries = await Agent.distinct('industry', { status: 'accepted' });
    const pricingModels = await Agent.distinct('price', { status: 'accepted' });
    const accessModels = await Agent.distinct('accessModel', { status: 'accepted' });
  
//  
    res.json({
      categories,
      industries,
      pricingModels,
      accessModels,
      popularity
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    // If there's no query, return an empty response
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // List of stop words to exclude from search
    const stopWords = [
     // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'this', 'that', 'these', 'those',

  // Auxiliary verbs and common conjunctions
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 
  'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',

  // Common question words and adverbs
  'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'here', 'there', 'when', 'where', 'why', 'how', 
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',

  // Negations and modal verbs
  'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'mightn', 'mustn', 'needn', 'shan', 
  'shouldn', 'wasn', 'weren', 'won', 'wouldn', 'ain', 'ma',

      'agent','agents','service','system', 'application', 'platform', 'feature', 'technology', 'solution',
      'function','resources','company','companies','product','products','software','app','apps','tool','tools',
      'thing','generate','recommendations','recommendation','find','search','searching','searched','searches'
    ];

    // Split the query into words, filter out stop words
    const filteredQuery = query
      .split(' ')
      .filter(word => !stopWords.includes(word.toLowerCase()))
      .join(' ');

    // If the query becomes empty after filtering, return an error
    if (!filteredQuery) {
      return res.status(400).json({ message: 'Search query is too generic or contains only stop words' });
    }

    // Perform the search with the filtered query
    const agents = await Agent.find(
      { $text: { $search: filteredQuery } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } });

    res.status(200).json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Failed to fetch agents', error: error.message });
  }
});

// Endpoint to get top-liked agent per category
router.get('/top-likes-by-category', async (req, res) => {
  try {
    // Aggregate agents by category, filter by status, sort by likes, and get the top agent from each category
    const topAgents = await Agent.aggregate([
      { $match: { status: "accepted" } }, // Filter agents with status 'accepted'
      { $sort: { likes: -1 } }, // Sort agents by likes in descending order
      {
        $group: {
          _id: "$category", // Group by category
          agent: { $first: "$$ROOT" } // Get the top agent in each category
        }
      },
      { $replaceRoot: { newRoot: "$agent" } } // Replace root to have clean structure
    ]);

    res.json(topAgents);
  } catch (error) {
    console.error("Error fetching top agents by category:", error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});



// Weights for each attribute in similarity calculation
const WEIGHTS = {
  category: 3,
  tags: 2,
  description: 1,
};

// Function to calculate similarity score
function calculateSimilarityScore(agent, otherAgent) {
  let score = 0;

  // Category match
  if (agent.category === otherAgent.category) {
    score += WEIGHTS.category;
  }

  // Tag match - count overlapping tags
  const matchingTags = agent.tags.filter(tag => otherAgent.tags.includes(tag)).length;
  score += matchingTags * WEIGHTS.tags;

  // Description match - simple check for shared keywords
  if (agent.description && otherAgent.description) {
    const agentDescriptionWords = new Set(agent.description.split(' '));
    const otherDescriptionWords = new Set(otherAgent.description.split(' '));
    const matchingWords = [...agentDescriptionWords].filter(word => otherDescriptionWords.has(word)).length;
    score += matchingWords * WEIGHTS.description;
  }

  return score;
}

// Get specific agent details along with best-matching agents
router.get('/similar/:id', async (req, res) => {
  try {
    const agentId = req.params.id;

    // Fetch the specific agent
    const agent = await Agent.findOne({ _id: agentId});

    if (!agent) {
      return res.status(201).json({ message: 'Agent not found' });
    }

    // Fetch other agents to find similar matches
    const otherAgents = await Agent.find({ _id: { $ne: agentId },status: 'accepted' });

    // Calculate similarity scores
    const similarAgents = otherAgents.map(otherAgent => {
      const similarityScore = calculateSimilarityScore(agent, otherAgent);
      return { agent: otherAgent, score: similarityScore };
    });

    // Sort by the highest score and take the top 5 results
    const bestMatches = similarAgents
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(match => match.agent);

    // Send both agent and bestMatches in response
    res.json({ agent, bestMatches });
  } catch (error) {
    console.error('Error fetching agent details:', error);
    res.status(500).json({ message: 'Error fetching agent details', error });
  }
});



router.post('/create', async (req, res) => {
  try {
    console.log('Request body:', req.body);  
    console.log('Files received:', req.files);

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

    // Handle logo upload
    let logoUrl = null;
    if (req.files && req.files.logo) {
      const logo = await cloudinary.uploader.upload(req.files.logo.tempFilePath, {
        folder: 'agents',
      });
      logoUrl = logo.secure_url;
    }

    // Handle thumbnail upload
    let thumbnailUrl = null;
    if (req.files && req.files.thumbnail) {
      const thumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
        folder: 'agents',
      });
      thumbnailUrl = thumbnail.secure_url;
    }
    const agentPrice = price ? price : 0;
    // Convert comma-separated string values to arrays if they exist
    const keyFeaturesArray = keyFeatures ? keyFeatures.split(',').map(item => item.trim()) : [];
    const useCasesArray = useCases ? useCases.split(',').map(item => item.trim()) : [];
    const tagsArray = tags ? tags.split(',').map(item => item.trim()) : [];

    // Create the new agent object
    const agent = new Agent({
      name,
      createdBy,
      websiteUrl,
      accessModel,
      pricingModel,
      category,
      industry,
      price:agentPrice,
      ownerEmail,
      shortDescription:tagline,
      description,
      keyFeatures: keyFeaturesArray,
      useCases: useCasesArray,
      tags: tagsArray,
      logo: logoUrl,
      thumbnail: thumbnailUrl,
      videoUrl,
      individualPlan,
      enterprisePlan,
      subscriptionModel,
      refundPolicy
    });

    // Save the agent to the database
    await agent.save();

    res.status(201).json({ message: 'Agent created successfully', agent });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Failed to create agent', error: error.message });
  }
});
router.post('/triedby/:id', async (req, res) => {
  try {
 
    const agentId = req.params.id;
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    agent.triedBy += 1;
    agent.calculatePopularity(); // Recalculate popularity
    await agent.save();
    res.status(200).json({ message: 'Tried By Count Updated Successfully', agent });
  } catch (error) {
    console.error('Error updating tried by count:', error);
    res.status(500).json({ message: 'Failed to update tried by count', error: error.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching agent details', error });
  }
});

// Define a dedicated search route
// router.get('/search', async (req, res) => {
//   console.log('Search route hit');
//   const { query } = req.query;
//   console.log('Search query:', query);

//   try {
    
//     res.status(200).json({ message: 'Search route hit' });
//   } catch (error) {
//     console.log('Error:', error);
//     res.status(500).json({
//       message: 'Error fetching agents',
//       error: error.message
//     });
//   }
// });




export default router;
