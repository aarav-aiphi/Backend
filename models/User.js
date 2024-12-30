import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
const userSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  username: { type: String },
  profileImage: { type: String },
  shortBio: { type: String },
  email: { type: String, required: true },
  password: { type: String },
  googleId: { type: String },
  isAdmin:{
    type:Boolean,
    default:false


  },
  role:{
    type:'String',
    enum:['user','admin','superadmin'],
    default:'user'
  },
  socialLogins: {
    google: { type: String },
    facebook: { type: String },
    linkedin: { type: String }
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  }],
  twoFactorCode: { type: String },
  twoFactorCodeExpires: { type: Date },
  courses: [{ type: String }],
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  likedAgents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  searchHistory: [{
    query: String,
    timestamp: { type: Date, default: Date.now },
    results: [{
      agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent'
      },
      name: String
    }]
  }]
  
});


userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, { expiresIn:'7d' });
  return token;
};
userSchema.methods.generatePasswordReset = function() {
  this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // Expires in 1 hour
};

userSchema.methods.ge
const User = mongoose.model('User', userSchema);

export default User;