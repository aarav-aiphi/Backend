// backend/routes/news.js
import express from 'express';
import axios from 'axios';

const router = express.Router();

// In-memory cache object
const cache = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Helper function to create a unique cache key based on query parameters
const createCacheKey = (queryParams) => {
    const { q = '', sources = '', page = 1, pageSize = 10 } = queryParams;
    return `q=${q}&sources=${sources}&page=${page}&pageSize=${pageSize}`;
};

// GET news articles with optional filters
router.get('/', async (req, res) => {
    const currentTime = Date.now();
    const { q = 'Artificial Intelligence OR AI Agents OR Machine Learning', sources = '', page = 1, pageSize = 12 } = req.query;

    const cacheKey = createCacheKey({ q, sources, page, pageSize });

    // Check if the response for this cacheKey exists and is still valid
    if (cache[cacheKey] && (currentTime - cache[cacheKey].timestamp < CACHE_DURATION)) {
        console.log(`Serving cached data for key: ${cacheKey}`);
        return res.json(cache[cacheKey].data);
    }

    try {
        const params = {
            q,
            language: 'en',
            sortBy: 'publishedAt',
            page,
            pageSize,
            apiKey: process.env.NEWS_API_KEY,
        };

        if (sources) {
            params.sources = sources;
        }

        console.log(`Fetching news with params: ${JSON.stringify(params)}`);

        const response = await axios.get('https://newsapi.org/v2/everything', { params });

        // Store the response in cache
        cache[cacheKey] = {
            data: response.data,
            timestamp: currentTime,
        };

        res.json(response.data);
    } catch (error) {
        console.error('News API Error:', error.message);
        res.status(500).json({ message: 'Error fetching news articles' });
    }
});

// GET available news sources
let cachedSources = null;
let sourcesCacheTimestamp = null;
const SOURCES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

router.get('/sources', async (req, res) => {
    const currentTime = Date.now();

    // Serve cached sources if still valid
    if (cachedSources && (currentTime - sourcesCacheTimestamp < SOURCES_CACHE_DURATION)) {
        console.log('Serving cached news sources');
        return res.json({ sources: cachedSources });
    }

    try {
        const response = await axios.get('https://newsapi.org/v2/sources', {
            params: {
                category: 'technology',
                language: 'en',
                apiKey: process.env.NEWS_API_KEY,
            },
        });

        cachedSources = response.data.sources;
        sourcesCacheTimestamp = currentTime;

        console.log('Fetched and cached new news sources');

        res.json({ sources: cachedSources });
    } catch (error) {
        console.error('News Sources API Error:', error.message);
        res.status(500).json({ message: 'Error fetching news sources' });
    }
});

export default router;
