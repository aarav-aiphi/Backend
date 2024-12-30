// routes/superadminRoutes.js
import express from 'express';
import { getAllPendingChanges, approveChange, rejectChange } from '../controllers/superadminController.js';
import { authorizeSuperadmin } from '../middleware/authorizeSuperadmin.js';

const router = express.Router();

// Protect all routes in this router with superadmin authorization
router.use(authorizeSuperadmin);

// Route to get all pending changes
router.get('/pending-changes', getAllPendingChanges);

// Route to approve a pending change
router.post('/approve/:changeId', approveChange);

// Route to reject a pending change
router.post('/reject/:changeId', rejectChange);

export default router;
