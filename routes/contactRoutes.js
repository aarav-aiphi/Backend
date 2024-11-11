// Backend/routes/contactRoutes.js

import express from 'express';
import { submitContact } from '../controllers/contactController.js';

const router = express.Router();

// Route to handle contact form submissions
router.post('/', submitContact);

export default router;