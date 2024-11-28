// server.js

import express from 'express';
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import agentRoutes from './routes/agentRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import fileUpload from 'express-fileupload';
import session from 'express-session';
import passport from 'passport';
import './config/passport.js';
import adminRoutes from './routes/adminRoutes.js';
import useCasesRoutes from './routes/useCasesRoutes.js';
import newsletterRoutes from './routes/newsletter.js';
import newsRoutes from './routes/news.js';
import blogRoutes from './routes/blogRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import Agent from './models/Agent.js';

const app = express();

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cookieParser());
// app.use(cors({
//   origin: ['http://localhost:1234','https://aiazent.vercel.app'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true,
// }));
const allowedOrigins = ['http://localhost:1234', 'https://aiazent.vercel.app','https://aiazent.ai','https://www.aiazent.ai'];



const corsOptions = {
  origin: function (origin, callback) {
    // Check if the request origin is in the list of allowed origins
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "DELETE", "PUT"],
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',  // Ensure this directory exists and is writable
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    abortOnLimit: true,
    responseOnLimit: 'File size limit has been reached',
  })
);
app.use(session({
  secret: 'avcscs3',
  resave: false,
  saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


const BASE_URL = 'https://aiazent.ai';
const staticUrls = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/agentform', changefreq: 'monthly', priority: 0.8 },
  { url: '/sponsorship', changefreq: 'monthly', priority: 0.8 },
  { url: '/allagent', changefreq: 'monthly', priority: 0.8 },
  { url: '/login', changefreq: 'monthly', priority: 0.8 },
  { url: '/signup', changefreq: 'monthly', priority: 0.8 },
  { url: '/admin-dashboard', changefreq: 'monthly', priority: 0.8 },
  { url: '/map', changefreq: 'monthly', priority: 0.8 },
  { url: '/news', changefreq: 'monthly', priority: 0.8 },
  { url: '/blogs', changefreq: 'monthly', priority: 0.8 },
  { url: '/add-blog', changefreq: 'monthly', priority: 0.8 },
  { url: '/userdash', changefreq: 'monthly', priority: 0.8 },
  { url: '/privacy', changefreq: 'yearly', priority: 0.5 },
  { url: '/contact', changefreq: 'monthly', priority: 0.8 },
  { url: '/community', changefreq: 'monthly', priority: 0.8 },
  // Add other static routes as needed
];
// Function to get dynamic URLs for agents
const getAgentUrls = async () => {
  try {
    const agents = await Agent.find({}, '_id'); // Fetch only the _id field
    return agents.map(agent => ({
      url: `/agent/${agent._id}`,
      changefreq: 'weekly',
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching agent URLs:', error);
    return [];
  }
};
// Sitemap Route
app.get('/sitemap.xml', async (req, res) => {
  try {
    // Fetch dynamic URLs
    const agentUrls = await getAgentUrls();


    // Combine all URLs
    const allUrls = [...staticUrls, ...agentUrls];

    // Create a stream to write to
    const sitemapStream = new SitemapStream({ hostname: BASE_URL });

    // Convert the URLs to a Readable stream
    const xmlString = await streamToPromise(Readable.from(allUrls).pipe(sitemapStream)).then(data => data.toString());

    // Set the content type and send the XML
    res.header('Content-Type', 'application/xml');
    res.send(xmlString);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).end();
  }
});








// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usecase', useCasesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/contact', contactRoutes);
// Basic route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
