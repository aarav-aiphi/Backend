import mongoose, { version } from 'mongoose';

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true,unique:true },
  createdBy: { type: String},
  websiteUrl: { type: String, required: true},
  ownerEmail: { type: String},
  accessModel: { type: String, required: true, enum: ['Open Source', 'Closed Source', 'API'] },
  pricingModel: { type: String, required: true, enum: ['Free', 'Freemium', 'Paid'] },
  category: { type: String, required: true },
  industry: { type: String, required: true },
  tagline: { type: String },
  description: { type: String},
  keyFeatures: { type: [String] },
  useCases: { type: [String]},    
  popularityScore: { type: Number, default: 0 },
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
  price: { type: String },
  gallery: { type: [String] },
  freeTrial: { type: Boolean, default: false },
  subscriptionModel: { type: String },
  status: { type: String, enum: ['requested', 'accepted', 'rejected','onHold'], default: 'requested' },
  savedByCount: { type: Number, default: 0 },

  version: { type: Number, default: 0},
  featured: { type: Boolean, default: false }

});
agentSchema.index({
  name: 'text',
  description: 'text',
  tagline: 'text',
  tags: 'text',
  keyFeatures: 'text',
  useCases: 'text',
  category: 'text',
  industry: 'text'
}, {
  weights: {
    name: 10,                 // Higher weight for name
    tagline: 8,      // High weight for short description
    tags: 7,                  // High weight for tags
    description: 2,           // Lower weight for description
    keyFeatures: 5,
    useCases: 5,
    category: 3,
    industry: 3
  }
});

agentSchema.methods.calculatePopularity = function () {
  const { triedBy, likes, savedByCount } = this; // Corrected variable name
  // Define your weights here
  const triedByWeight = 1;
  const likesWeight = 2;
  const savedByCountWeight = 2;
  
  this.popularityScore = (triedBy * triedByWeight) + (likes * likesWeight) + (savedByCount * savedByCountWeight);
};
agentSchema.pre('save', function (next) {
  this.calculatePopularity();
  next();
});

const Agent = mongoose.model('Agent', agentSchema);

export default Agent;
