import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 35 },
  createdBy: { type: String, maxlength: 50 },
  websiteUrl: { type: String, required: true, maxlength: 100 },
  contactEmail: { type: String, maxlength: 50 },
  accessModel: { type: String, required: true, enum: ['Open Source', 'Closed Source', 'API'] },
  pricingModel: { type: String, required: true, enum: ['Free', 'Freemium', 'Paid'] },
  category: { type: String, required: true },
  industry: { type: String, required: true },
  tagline: { type: String },
  description: { type: String},
  shortDescription:{type:String},
  keyFeatures: { type: [String] },
  useCases: { type: [String]},    
  //  these usecases should be name agent usecases
  // use role also included in the agent schema
  //  usecases must be in database(Below Search function in frontend)
  //   Short useCases .........String with prefix and suffix combine with usecases
  // User telling something (user role  eg... i am accountant) and we have to predict the usecases according to that
  useRole:{type:String},
  tags: { type: [String]},
  logo: { type: String },
  thumbnail: { type: String },
  videoUrl: { type: String},
  isHiring: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  triedBy: { type: Number, default: 0 },
  reviewRatings: { type: Number, default: 0 },
  votesThisMonth: { type: Number, default: 0 },
  integrationSupport: { type: String, default: 'None' },
  price: { type: String, required: true },
  gallery: { type: [String] },
  individualPlan: { type: String },
  enterprisePlan: { type: String },
  freeTrial: { type: Boolean, default: false },
  subscriptionModel: { type: String },
  refundPolicy: { type: String },
  companyResources: {
    website: { type: String },
    otherResources: { type: [String] }
  },
  status: { type: String, enum: ['requested', 'accepted', 'rejected','onHold'], default: 'requested' },
  savedByCount: { type: Number, default: 0 },
  ownerEmail: { type: String},
  

});
agentSchema.index({
  name: 'text',
  description: 'text',
  shortDescription: 'text',
  tags: 'text',
  keyFeatures: 'text',
  useCases: 'text',
  category: 'text',
  industry: 'text'
}, {
  weights: {
    name: 10,                 // Higher weight for name
    shortDescription: 7,      // High weight for short description
    tags: 10,                  // High weight for tags
    description: 2,           // Lower weight for description
    keyFeatures: 4,
    useCases: 4,
    category: 5,
    industry: 5
  }
});


const Agent = mongoose.model('Agent', agentSchema);

export default Agent;
