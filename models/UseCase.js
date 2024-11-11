import mongoose from 'mongoose';

const useCaseSchema = new mongoose.Schema({
  name: { type: String, required: true },  // Use case name
});

const UseCase = mongoose.model('UseCase', useCaseSchema);

export default UseCase;
