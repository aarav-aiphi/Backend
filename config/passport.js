// File: config/passport.js

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js'; // Adjust the path as needed

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://backend-1-sval.onrender.com/api/users/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // First, try to find the user by their email
    let user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // If user exists but doesn't have googleId, set it
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
    } else {
      // If the user doesn't exist, create a new user
      user = new User({
        googleId: profile.id,
        firstName: profile.name.givenName || '',
        lastName: profile.name.familyName || '',
        email: profile.emails[0].value,
        profileImage: profile.photos[0]?.value || '',
      });
      await user.save();
    }
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
