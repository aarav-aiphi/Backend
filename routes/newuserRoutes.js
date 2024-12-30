import express from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import Agent from '../models/Agent.js';

const router = express.Router();

// Function to generate token and set it in cookies
const generateToken = (user, res, statusCode, message) => {
  const token = jwt.sign(
    { id: user._id, isAdmin: user.isAdmin }, // Include isAdmin in token payload
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // Secure only in production
  sameSite: isProduction ? 'None' : 'Lax', // Use 'Lax' for dev to avoid the issue
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
};


  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isAdmin: user.isAdmin, // Include isAdmin in response
    },
    token,
  });
};
// Token verification middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.userId = decoded.id; // Attach user ID to request
    req.isAdmin = decoded.isAdmin; // Attach isAdmin to request
    next();
  });
};

// Admin check middleware
const verifyAdmin = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.userId = decoded.id;
    next();
  });
};


// SIGNUP Route
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, isAdmin,role } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(201).json({ message: 'User already exists with this email' });
    }

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      firstName,
      lastName,
      phone,
      email,
      role,
      password: hashedPassword,
      isAdmin: isAdmin || false, // Set isAdmin from the request or default to false
    });

    // Save the new user to the database
    const savedUser = await newUser.save();

    // Generate token and set it in cookies
    generateToken(savedUser, res, 200, 'User registered successfully');
  } catch (error) {
    console.error('Error signing up user:', error);
    res.status(500).json({ message: 'Error signing up user', error });
  }
});
router.get('/current_user', verifyToken,async (req, res) => {
  const user=await User.findById(req.userId);
  res.status(200).json({ user: user });
});


// LOGIN Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    console.log(password,user.password);
    // Check if the password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate token and set it in cookies
    generateToken(user, res, 200, 'Login successful');
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in user', error });
  }
});

// LOGOUT Route
router.post('/logout', (req, res) => {
  
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    secure: isProduction, // Secure only in production
    sameSite: isProduction ? 'None' : 'Lax', // Use 'Lax' for dev to avoid the issue
  });
  res.status(200).json({ message: 'Logout successful' });
});


// Protected admin route
router.get('/admin-only', verifyAdmin, (req, res) => {
  res.status(200).json({ message: 'Admin route accessed' });
});

// Token verification middleware

// Like Agent Route (Protected)
router.put('/:id/like', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const agentId = req.params.id;
    console.log('hye',userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if the user has already liked the agent
    if (user.likedAgents.includes(agentId)) {
      return res.status(400).json({ message: 'You have already liked this agent' });
    }

    // Update agent's like count and user's likedAgents
    agent.likes += 1;
    await agent.save();

    user.likedAgents.push(agentId);
    await user.save();

    res.status(200).json({ message: 'Agent liked successfully', likes: agent.likes });
  } catch (error) {
    console.error('Error liking agent:', error);
    res.status(500).json({ message: 'Error liking agent', error });
  }
});


router.post('/wishlist/:agentId', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const agentId = req.params.agentId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if the agent is already in the wishlist
    const isInWishlist = user.wishlist.some(id => id && id.equals(agentId));

    if (isInWishlist) {
      // If in wishlist, remove it and decrement savedByCount
      user.wishlist = user.wishlist.filter(id => id && !id.equals(agentId));
      agent.savedByCount = Math.max(0, agent.savedByCount - 1);
      agent.calculatePopularity(); // Recalculate popularity
      await agent.save();
      await user.save();
      res.status(201).json({ message: 'Agent removed from wishlist', agent});
    } else {
      // If not in wishlist, add it and increment savedByCount
      user.wishlist.push(agentId);
      agent.savedByCount += 1;
      agent.calculatePopularity(); // Recalculate popularity
      await agent.save();
      await user.save();
      res.status(200).json({ message: 'Agent added to wishlist', agent});
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    res.status(500).json({ message: 'Error toggling wishlist', error: error.message });
  }
});
router.post('/like/:agentId', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const agentId = req.params.agentId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Check if the agent is already in the wishlist
    const isliked = user.likedAgents.some(id => id && id.equals(agentId));

    if (isliked) {
      // If in wishlist, remove it and decrement savedByCount
      user.likedAgents = user.likedAgents.filter(id => id && !id.equals(agentId));
      agent.likes = Math.max(0, agent.likes - 1);
      agent.calculatePopularity(); // Recalculate popularity
      await agent.save();
      await user.save();
      res.status(201).json({ message: 'Like Removed', agent});
    } else {
      // If not in wishlist, add it and increment savedByCount
      user.likedAgents.push(agentId);
      agent.likes += 1;
      agent.calculatePopularity(); // Recalculate popularity
await agent.save();
      await user.save();
      res.status(200).json({ message: 'Like Added', agent});
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    res.status(500).json({ message: 'Error toggling wishlist', error: error.message });
  }
});
router.get('/wishlist', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Find the user and populate the wishlist with agent details
    const user = await User.findById(userId).populate('wishlist');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ wishlist: user.wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ message: 'Failed to fetch wishlist', error: error.message });
  }
});
router.get('/liked-agents', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Find the user and populate the likedAgents with agent details
    const user = await User.findById(userId).populate('likedAgents');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ likedAgents: user.likedAgents });
  } catch (error) {
    console.error('Error fetching liked agents:', error);
    res.status(500).json({ message: 'Failed to fetch liked agents', error: error.message });
  }
});

router.post('/save-search', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Validate results format
    

    // Prepare search results
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new search entry
    const newSearch = {
      query,
    };
    user.searchHistory.push(newSearch);

    // Save the user
    await user.save();

    res.status(200).json({ message: 'Search saved successfully', search: newSearch });
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ message: 'Error saving search', error: error.message });
  }
});
router.get('/search-history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Find the user and select only the searchHistory field
    const user = await User.findById(userId).select('searchHistory');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ searchHistory: user.searchHistory });
  } catch (error) {
    console.error('Error retrieving search history:', error);
    res.status(500).json({ message: 'Error retrieving search history', error: error.message });
  }
});


// LOGOUT Route
router.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'None', secure: process.env.NODE_ENV === 'production' });
  res.status(200).json({ message: 'Logout successful' });
});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Generate JWT token
    const userId = req.user._id;
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Send token as a cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Redirect to the desired URL after successful login
    res.redirect('https://www.aiazent.ai');
  }
);


// Get current user route

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.generatePasswordReset();
    await user.save();

    const resetUrl = `https://www.aiazent.ai/reset-password/${user.resetPasswordToken}`;

    // Send email
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use false for STARTTLS; true for SSL on port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
      Please click on the following link, or paste this into your browser to complete the process:\n\n
      ${resetUrl}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log('Error:', error);
        return res.status(500).json({ message: 'Error sending email' });
      } else {
        console.log('Email sent: ', info.response);
        res.status(200).json({ message: 'Password reset email sent' });
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting password reset', error });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been reset' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error });
  }
});



export default router;
