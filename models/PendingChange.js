// models/PendingChange.js
import mongoose from 'mongoose';

const pendingChangeSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['create', 'update', 'delete','status_change'],
    required: true,
  },
  collection: {
    type: String,
    required: true,
    enum: ['agents'], // Extend this array if you have more collections
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'Agent',
    required: function () {
      return this.action !== 'create';
    },
  },
  newData: {
    type: mongoose.Schema.Types.Mixed, // Stores data for create/update
    required: function () {
      return this.action !== 'delete';
    },
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
}, { timestamps: true });

const PendingChange = mongoose.model('PendingChange', pendingChangeSchema);
export default PendingChange;
