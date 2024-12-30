// middleware/authorizeSuperadmin.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
export const authorizeSuperadmin = async(req, res, next) => {
      const token=req.cookies.token;
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        console.log(user);
        req.user=user;
        if (req.user.role !== 'superadmin') {
          return res.status(403).json({ message: 'Superadmin access required' });
        }
        next();
      } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ message: 'Invalid token or token verification failed', error: error.message });
      }
  
    
  };
  