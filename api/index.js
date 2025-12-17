// Vercel serverless function wrapper for Express API
// This file allows the Express server to run as a serverless function on Vercel

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cheerio = require('cheerio');
const multer = require('multer');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// For Vercel, we need to use /tmp for file storage (writable directory)
const DATA_FILE = path.join('/tmp', 'wishlist.json');
const USERS_FILE = path.join('/tmp', 'users.json');
const UPLOADS_DIR = path.join('/tmp', 'uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'item-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Serve uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Initialize data file if it doesn't exist
async function initializeData() {
  try {
    await fs.access(DATA_FILE);
    const data = await readData();
    let needsUpdate = false;
    if (data.kids) {
      data.kids.forEach(kid => {
        if (!kid.shareToken) {
          kid.shareToken = generateShareToken();
          needsUpdate = true;
        }
        if (!kid.userId && !data.migrated) {
          kid.userId = 'default-user';
          needsUpdate = true;
        }
      });
      if (needsUpdate) {
        data.migrated = true;
        await writeData(data);
      }
    }
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ kids: [], migrated: false }, null, 2));
  }
}

// Read data from file
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    let needsUpdate = false;

    if (parsed.kids) {
      parsed.kids.forEach(kid => {
        if (!kid.shareToken) {
          kid.shareToken = generateShareToken();
          needsUpdate = true;
        }
        if (kid.wishlist) {
          kid.wishlist.forEach(item => {
            if (item.purchased === undefined) {
              item.purchased = false;
              needsUpdate = true;
            }
            if (item.purchasedBy === undefined) {
              item.purchasedBy = '';
              needsUpdate = true;
            }
          });
        }
      });
    }

    if (needsUpdate) {
      await writeData(parsed);
    }

    return parsed;
  } catch (error) {
    return { kids: [] };
  }
}

// Write data to file
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Generate a unique share token
function generateShareToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Extract OG image from URL
async function extractImageFromUrl(url) {
  try {
    if (!url || !url.startsWith('http')) {
      return null;
    }
    
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let imageUrl = $('meta[property="og:image"]').attr('content');
    
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content');
    }
    if (!imageUrl) {
      imageUrl = $('meta[itemprop="image"]').attr('content');
    }
    
    if (!imageUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
      return url;
    }
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        imageUrl = new URL(imageUrl, baseUrl).href;
      } catch (e) {
        return null;
      }
    }
    
    return imageUrl || null;
  } catch (error) {
    console.error('Error extracting image from URL:', error.message);
    return null;
  }
}

// Extract product title from URL
async function extractTitleFromUrl(url) {
  try {
    if (!url || !url.startsWith('http')) {
      return null;
    }
    
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let title = $('meta[property="og:title"]').attr('content');
    
    if (!title) {
      title = $('meta[name="twitter:title"]').attr('content');
    }
    if (!title) {
      title = $('meta[itemprop="name"]').attr('content');
    }
    
    if (!title) {
      title = $('title').text();
    }
    
    if (title) {
      title = title.trim().replace(/\s+/g, ' ');
      title = title.replace(/\s*[|\-–—]\s*.*$/, '');
    }
    
    return title || null;
  } catch (error) {
    console.error('Error extracting title from URL:', error.message);
    return null;
  }
}

// Initialize users file
async function initializeUsers() {
  try {
    const dataDir = path.dirname(USERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
  } catch (error) {
    console.error('Error initializing users file:', error);
    throw error;
  }
}

// Read users from file
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.users)) {
      return { users: [] };
    }
    return parsed;
  } catch (error) {
    return { users: [] };
  }
}

// Write users to file
async function writeUsers(data) {
  try {
    const dataDir = path.dirname(USERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
    throw error;
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Optional auth middleware
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
}

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Import all routes from server/index.js
// For brevity, I'll include the key routes - you may want to refactor server/index.js
// to export routes instead of running a server

// Authentication Routes
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  await ensureDataDir();
  let usersData = await readUsers();
  
  if (!usersData || !usersData.users || !Array.isArray(usersData.users)) {
    usersData = { users: [] };
  }
  
  const existingUser = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (existingUser) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };
  
  usersData.users.push(newUser);
  await writeUsers(usersData);
  
  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email
    }
  });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  await ensureDataDir();
  const usersData = await readUsers();
  const user = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email
    }
  });
}));

app.get('/api/auth/me', authenticateToken, asyncHandler(async (req, res) => {
  const usersData = await readUsers();
  const user = usersData.users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    email: user.email
  });
}));

// Kids routes
app.get('/api/kids', optionalAuth, asyncHandler(async (req, res) => {
  const data = await readData();
  let kids = data.kids || [];
  
  if (req.user && req.user.userId) {
    kids = kids.filter(kid => kid.userId === req.user.userId);
  }
  
  kids = kids.map(kid => {
    const isOwner = req.user && req.user.userId === kid.userId;
    return {
      ...kid,
      wishlist: kid.wishlist.map(item => {
        const itemCopy = { ...item };
        if (!isOwner && itemCopy.purchasedByEmail) {
          delete itemCopy.purchasedByEmail;
        }
        return itemCopy;
      })
    };
  });
  
  res.json(kids);
}));

app.post('/api/kids', authenticateToken, asyncHandler(async (req, res) => {
  const { name, age } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const data = await readData();
  const newKid = {
    id: Date.now().toString(),
    name,
    age: age || null,
    wishlist: [],
    shareToken: generateShareToken(),
    userId: req.user.userId
  };
  data.kids.push(newKid);
  await writeData(data);
  res.json(newKid);
}));

app.delete('/api/kids/:kidId', authenticateToken, asyncHandler(async (req, res) => {
  const { kidId } = req.params;
  const data = await readData();
  const kid = data.kids.find(k => k.id === kidId);
  
  if (!kid) {
    return res.status(404).json({ error: 'Kid not found' });
  }
  
  if (kid.userId !== req.user.userId) {
    return res.status(403).json({ error: 'You do not have permission to delete this list' });
  }
  
  data.kids = data.kids.filter(k => k.id !== kidId);
  await writeData(data);
  res.json({ success: true });
}));

// Upload image
app.post('/api/upload-image', authenticateToken, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  // For Vercel, we need to return a URL that can be accessed
  // Since /tmp is not publicly accessible, you'll need to use a service like Cloudinary
  // For now, return a placeholder or use a different storage solution
  const imageUrl = `/api/uploads/${req.file.filename}`;
  res.json({ imageUrl });
}));

// Extract title
app.post('/api/extract-title', authenticateToken, asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const title = await extractTitleFromUrl(url);
  res.json({ title });
}));

// Items routes
app.post('/api/kids/:kidId/items', authenticateToken, asyncHandler(async (req, res) => {
  const { kidId } = req.params;
  const { name, description, url, priority, imageUrl } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  
  const data = await readData();
  const kid = data.kids.find(k => k.id === kidId);
  
  if (!kid) {
    return res.status(404).json({ error: 'Kid not found' });
  }
  
  if (kid.userId !== req.user.userId) {
    return res.status(403).json({ error: 'You do not have permission to edit this list' });
  }
  
  let finalImageUrl = imageUrl || '';
  if (!finalImageUrl && url) {
    finalImageUrl = await extractImageFromUrl(url) || '';
  }
  
  const newItem = {
    id: Date.now().toString(),
    name,
    description: description || '',
    url: url || '',
    imageUrl: finalImageUrl,
    priority: priority || 'medium',
    addedAt: new Date().toISOString(),
    purchased: false,
    purchasedBy: '',
    purchasedByEmail: '',
    purchasedAt: null
  };
  
  kid.wishlist.push(newItem);
  await writeData(data);
  res.json(newItem);
}));

app.put('/api/kids/:kidId/items/:itemId', optionalAuth, asyncHandler(async (req, res) => {
  const { kidId, itemId } = req.params;
  const updates = { ...req.body };

  const data = await readData();
  const kid = data.kids.find(k => k.id === kidId);
  
  if (!kid) {
    return res.status(404).json({ error: 'Kid not found' });
  }
  
  const item = kid.wishlist.find(i => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  const isPurchaseUpdate = updates.hasOwnProperty('purchased') || 
                           updates.hasOwnProperty('purchasedBy') || 
                           updates.hasOwnProperty('purchasedByEmail');
  
  if (!isPurchaseUpdate) {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required to edit items' });
    }
    if (kid.userId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this list' });
    }
    
    if (!updates.imageUrl && updates.url && updates.url !== item.url) {
      const extractedImage = await extractImageFromUrl(updates.url);
      if (extractedImage) {
        updates.imageUrl = extractedImage;
      }
    }
  }
  
  if (updates.purchased === false) {
    updates.purchasedBy = '';
    updates.purchasedByEmail = '';
    updates.purchasedAt = null;
  }
  
  if (updates.purchased === true && !item.purchasedAt) {
    updates.purchasedAt = new Date().toISOString();
  }
  
  Object.assign(item, updates);
  await writeData(data);
  
  const responseItem = { ...item };
  if (!req.user || req.user.userId !== kid.userId) {
    delete responseItem.purchasedByEmail;
  }
  
  res.json(responseItem);
}));

app.delete('/api/kids/:kidId/items/:itemId', authenticateToken, asyncHandler(async (req, res) => {
  const { kidId, itemId } = req.params;
  const data = await readData();
  const kid = data.kids.find(k => k.id === kidId);
  
  if (!kid) {
    return res.status(404).json({ error: 'Kid not found' });
  }
  
  if (kid.userId !== req.user.userId) {
    return res.status(403).json({ error: 'You do not have permission to delete items from this list' });
  }
  
  kid.wishlist = kid.wishlist.filter(i => i.id !== itemId);
  await writeData(data);
  res.json({ success: true });
}));

// Share routes
app.get('/api/share/:shareToken', asyncHandler(async (req, res) => {
  const { shareToken } = req.params;
  const data = await readData();
  const kid = data.kids.find(k => k.shareToken === shareToken);
  
  if (!kid) {
    return res.status(404).json({ error: 'Wishlist not found' });
  }
  
  const wishlist = kid.wishlist.map(item => {
    const itemCopy = { ...item };
    delete itemCopy.purchasedByEmail;
    return itemCopy;
  });
  
  res.json({
    id: kid.id,
    name: kid.name,
    wishlist: wishlist
  });
}));

app.post('/api/kids/:kidId/share-token', authenticateToken, asyncHandler(async (req, res) => {
  const { kidId } = req.params;
  const data = await readData();
  const kid = data.kids.find(k => k.id === kidId);
  
  if (!kid) {
    return res.status(404).json({ error: 'Kid not found' });
  }
  
  if (kid.userId !== req.user.userId) {
    return res.status(403).json({ error: 'You do not have permission to manage this list' });
  }
  
  kid.shareToken = generateShareToken();
  await writeData(data);
  res.json({ shareToken: kid.shareToken });
}));

// Search route
app.get('/api/search', asyncHandler(async (req, res) => {
  const { email, userId } = req.query;
  
  if (!email && !userId) {
    return res.status(400).json({ error: 'Email or userId is required' });
  }
  
  const data = await readData();
  const usersData = await readUsers();
  
  let targetUserId = null;
  
  if (email) {
    const user = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.json({ kids: [] });
    }
    targetUserId = user.id;
  } else {
    targetUserId = userId;
  }
  
  const kids = data.kids.filter(kid => kid.userId === targetUserId);
  const publicKids = kids.map(kid => ({
    id: kid.id,
    name: kid.name,
    shareToken: kid.shareToken,
    itemCount: kid.wishlist ? kid.wishlist.length : 0
  }));
  
  res.json({ kids: publicKids });
}));

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message || 'Unknown error occurred'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize on first request
let initialized = false;
async function initialize() {
  if (!initialized) {
    await ensureDataDir();
    await initializeUsers();
    await initializeData();
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    initialized = true;
  }
}

// Export for Vercel serverless function
module.exports = async (req, res) => {
  await initialize();
  return app(req, res);
};


