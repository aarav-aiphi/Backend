import express from 'express';
import UseCase from '../models/UseCase.js'; // Assuming the model is in models folder
const router = express.Router();

// Fetch all use cases from the database
router.get('/', async (req, res) => {
  try {
    const useCases = await UseCase.find(); // Fetch all use cases
    res.status(200).json(useCases); // Send the use cases in the response
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch use cases', error: error.message });
  }
});


router.post('/usecase', async (req, res) => {
    try {
      const { name } = req.body; // Extract the name of the use case from the request body
  
      // Ensure the name is provided
      if (!name) {
        return res.status(400).json({ message: 'Use case name is required' });
      }
  
      // Check if the use case already exists (optional, to prevent duplicates)
      const existingUseCase = await UseCase.findOne({ name });
      if (existingUseCase) {
        return res.status(400).json({ message: 'Use case already exists' });
      }
  
      // Create a new use case
      const newUseCase = new UseCase({ name });
  
      // Save the use case to the database
      await newUseCase.save();
  
      res.status(201).json({ message: 'Use case created successfully', useCase: newUseCase });
    } catch (error) {
      console.error('Error creating use case:', error);
      res.status(500).json({ message: 'Failed to create use case', error: error.message });
    }
  });
  

export default router;

