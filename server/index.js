// Polyfill File API for Node.js (required by undici/axios in Node.js 18)
// This must be defined before any modules that use it are loaded
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.name = name;
      this.size = Array.isArray(bits) ? bits.reduce((acc, bit) => acc + (bit.size || bit.length || 0), 0) : (bits?.size || bits?.length || 0);
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this._bits = bits;
    }
    stream() {
      return new ReadableStream();
    }
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0));
    }
    text() {
      return Promise.resolve('');
    }
    slice(start, end, contentType) {
      return new File([], this.name, { type: contentType || this.type });
    }
  };
  
  // Also define FileReader if needed
  if (typeof global.FileReader === 'undefined') {
    global.FileReader = class FileReader {
      constructor() {
        this.result = null;
        this.error = null;
        this.readyState = 0;
      }
      readAsArrayBuffer(file) {
        this.result = new ArrayBuffer(0);
        this.readyState = 2;
        if (this.onload) this.onload({ target: this });
      }
      readAsText(file) {
        this.result = '';
        this.readyState = 2;
        if (this.onload) this.onload({ target: this });
      }
      readAsDataURL(file) {
        this.result = 'data:application/octet-stream;base64,';
        this.readyState = 2;
        if (this.onload) this.onload({ target: this });
      }
    };
  }
}

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
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATA_FILE = path.join(__dirname, 'data', 'wishlist.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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
// Configure CORS to allow frontend domain
const allowedOrigins = [
  'http://localhost:3000',
  'https://thehappyhaul.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now - tighten in production if needed
    }
  },
  credentials: true
}));
app.use(bodyParser.json());
// Serve uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

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
    // Migrate existing kids to have share tokens if they don't
    const data = await readData();
    let needsUpdate = false;
    if (data.kids) {
      data.kids.forEach(kid => {
        if (!kid.shareToken) {
          kid.shareToken = generateShareToken();
          needsUpdate = true;
        }
        // Migrate existing kids to have userId if they don't
        if (!kid.userId && !data.migrated) {
          // Create a default user for existing data
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

// Read data from file and ensure required defaults exist
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    let needsUpdate = false;

    if (parsed.kids) {
      parsed.kids.forEach(kid => {
        // Ensure share token exists
        if (!kid.shareToken) {
          kid.shareToken = generateShareToken();
          needsUpdate = true;
        }

        // Ensure wishlist items have purchase metadata
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
    
    // Try og:image first
    let imageUrl = $('meta[property="og:image"]').attr('content');
    
    // If no OG image, try other common meta tags
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content');
    }
    if (!imageUrl) {
      imageUrl = $('meta[itemprop="image"]').attr('content');
    }
    
    // If still no image, check if URL itself is an image
    if (!imageUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) {
      return url;
    }
    
    // Make relative URLs absolute
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
    
    // Try og:title first
    let title = $('meta[property="og:title"]').attr('content');
    
    // If no OG title, try other common meta tags
    if (!title) {
      title = $('meta[name="twitter:title"]').attr('content');
    }
    if (!title) {
      title = $('meta[itemprop="name"]').attr('content');
    }
    
    // If still no title, try the page title tag
    if (!title) {
      title = $('title').text();
    }
    
    // Clean up the title (remove extra whitespace, newlines, etc.)
    if (title) {
      title = title.trim().replace(/\s+/g, ' ');
      // Remove common suffixes like " | Amazon" or " - Store Name"
      title = title.replace(/\s*[|\-–—]\s*.*$/, '');
    }
    
    return title || null;
  } catch (error) {
    console.error('Error extracting title from URL:', error.message);
    return null;
  }
}

// Initialize users file if it doesn't exist
async function initializeUsers() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(USERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Check if file exists
    try {
      await fs.access(USERS_FILE);
      console.log('Users file exists');
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
      console.log('Created new users file');
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
    // Ensure the structure is valid
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.users)) {
      console.warn('Invalid users file structure, returning empty users');
      return { users: [] };
    }
    return parsed;
  } catch (error) {
    console.warn('Error reading users file, returning empty users:', error.message);
    return { users: [] };
  }
}

// Write users to file
async function writeUsers(data) {
  try {
    // Ensure directory exists
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
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

// Optional auth middleware (doesn't fail if no token)
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

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// API Routes

// Authentication Routes
// Register new user
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  console.log('=== REGISTRATION ENDPOINT HIT ===');
  console.log('Request body:', JSON.stringify(req.body));
  console.log('Request headers:', JSON.stringify(req.headers));
  
  try {
    const { email, password } = req.body;
    
    console.log('Registration attempt for:', email);
    
    if (!email || !password) {
      console.log('Registration failed: Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Registration failed: Invalid email format');
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      console.log('Registration failed: Password too short');
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Ensure data directory exists
    try {
      await ensureDataDir();
    } catch (error) {
      console.error('Error ensuring data directory:', error);
      return res.status(500).json({ error: 'Failed to initialize data directory' });
    }
    
    let usersData;
    try {
      usersData = await readUsers();
      // Ensure usersData has the expected structure
      if (!usersData || typeof usersData !== 'object' || !Array.isArray(usersData.users)) {
        console.log('Users data structure invalid, reinitializing');
        usersData = { users: [] };
        try {
          await writeUsers(usersData);
        } catch (writeError) {
          console.error('Error writing users file during reinit:', writeError);
          return res.status(500).json({ error: 'Failed to initialize user data file' });
        }
      }
      console.log('Read users data, found', usersData.users.length, 'existing users');
    } catch (error) {
      console.error('Error reading users file:', error);
      console.error('Error stack:', error.stack);
      // Initialize if file doesn't exist
      usersData = { users: [] };
      try {
        await writeUsers(usersData);
        console.log('Initialized new users file');
      } catch (writeError) {
        console.error('Error initializing users file:', writeError);
        console.error('Write error stack:', writeError.stack);
        return res.status(500).json({ error: 'Failed to initialize user data file' });
      }
    }
    
    // Ensure users array exists before searching
    if (!usersData || !usersData.users || !Array.isArray(usersData.users)) {
      console.warn('Users data invalid, resetting to empty array');
      usersData = { users: [] };
    }
    
    const existingUser = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      console.log('Registration failed: Email already exists');
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
      console.log('Password hashed successfully');
    } catch (error) {
      console.error('Error hashing password:', error);
      return res.status(500).json({ error: 'Failed to process password' });
    }
    
    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    usersData.users.push(newUser);
    
    try {
      await writeUsers(usersData);
      console.log('User saved to file successfully');
    } catch (error) {
      console.error('Error writing users file:', error);
      return res.status(500).json({ error: 'Failed to save user data' });
    }
    
    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('JWT token generated successfully');
    } catch (error) {
      console.error('Error generating token:', error);
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }
    
    console.log('Registration successful for:', email);
    res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Only send response if it hasn't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to register user',
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}));

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Ensure data directory exists
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
    
    // Generate JWT token
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const usersData = await readUsers();
    const user = usersData.users.find(u => u.id === req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get all kids and their wishlists
app.get('/api/kids', optionalAuth, async (req, res) => {
  try {
    const data = await readData();
    let kids = data.kids || [];
    
    // If authenticated, filter by userId; otherwise return all (for public viewing)
    if (req.user && req.user.userId) {
      kids = kids.filter(kid => kid.userId === req.user.userId);
    }
    
    // Filter purchaser email based on ownership
    kids = kids.map(kid => {
      const isOwner = req.user && req.user.userId === kid.userId;
      return {
        ...kid,
        wishlist: kid.wishlist.map(item => {
          const itemCopy = { ...item };
          // Only show email if user owns the list
          if (!isOwner && itemCopy.purchasedByEmail) {
            delete itemCopy.purchasedByEmail;
          }
          return itemCopy;
        })
      };
    });
    
    res.json(kids);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch kids' });
  }
});

// Add a new kid
app.post('/api/kids', authenticateToken, async (req, res) => {
  try {
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
      age: age || null, // Optional age field
      wishlist: [],
      shareToken: generateShareToken(),
      userId: req.user.userId
    };
    data.kids.push(newKid);
    await writeData(data);
    res.json(newKid);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add kid' });
  }
});

// Upload image endpoint
app.post('/api/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Extract product title from URL endpoint
app.post('/api/extract-title', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const title = await extractTitleFromUrl(url);
    res.json({ title });
  } catch (error) {
    console.error('Extract title error:', error);
    res.status(500).json({ error: 'Failed to extract title from URL' });
  }
});

// Add item to a kid's wishlist
app.post('/api/kids/:kidId/items', authenticateToken, async (req, res) => {
  try {
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
    
    // Check ownership
    if (kid.userId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this list' });
    }
    
    // If imageUrl not provided but url is, try to extract image
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Update an item
app.put('/api/kids/:kidId/items/:itemId', optionalAuth, async (req, res) => {
  try {
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
    
    // Check if this is a purchase update (allowed for everyone)
    const isPurchaseUpdate = updates.hasOwnProperty('purchased') || 
                             updates.hasOwnProperty('purchasedBy') || 
                             updates.hasOwnProperty('purchasedByEmail');
    
    // If not a purchase update, require authentication and ownership
    if (!isPurchaseUpdate) {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'Authentication required to edit items' });
      }
      if (kid.userId !== req.user.userId) {
        return res.status(403).json({ error: 'You do not have permission to edit this list' });
      }
      
      // If imageUrl not provided but url is updated, try to extract image
      if (!updates.imageUrl && updates.url && updates.url !== item.url) {
        const extractedImage = await extractImageFromUrl(updates.url);
        if (extractedImage) {
          updates.imageUrl = extractedImage;
        }
      }
    }
    
    // If purchased is explicitly false, clear purchasedBy, purchasedByEmail, and purchasedAt
    if (updates.purchased === false) {
      updates.purchasedBy = '';
      updates.purchasedByEmail = '';
      updates.purchasedAt = null;
    }
    
    // If marking as purchased and purchasedAt is not already set, set it now
    if (updates.purchased === true && !item.purchasedAt) {
      updates.purchasedAt = new Date().toISOString();
    }
    
    Object.assign(item, updates);
    await writeData(data);
    
    // Return item without email if user doesn't own the list
    const responseItem = { ...item };
    if (!req.user || req.user.userId !== kid.userId) {
      delete responseItem.purchasedByEmail;
    }
    
    res.json(responseItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item
app.delete('/api/kids/:kidId/items/:itemId', authenticateToken, async (req, res) => {
  try {
    const { kidId, itemId } = req.params;
    
    const data = await readData();
    const kid = data.kids.find(k => k.id === kidId);
    
    if (!kid) {
      return res.status(404).json({ error: 'Kid not found' });
    }
    
    // Check ownership
    if (kid.userId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete items from this list' });
    }
    
    kid.wishlist = kid.wishlist.filter(i => i.id !== itemId);
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Delete a kid
app.delete('/api/kids/:kidId', authenticateToken, async (req, res) => {
  try {
    const { kidId } = req.params;
    
    const data = await readData();
    const kid = data.kids.find(k => k.id === kidId);
    
    if (!kid) {
      return res.status(404).json({ error: 'Kid not found' });
    }
    
    // Check ownership
    if (kid.userId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this list' });
    }
    
    data.kids = data.kids.filter(k => k.id !== kidId);
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete kid' });
  }
});

// Get kid by share token (public view)
app.get('/api/share/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    
    const data = await readData();
    const kid = data.kids.find(k => k.shareToken === shareToken);
    
    if (!kid) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    
    // Return kid data without sensitive info (no email addresses)
    const wishlist = kid.wishlist.map(item => {
      const itemCopy = { ...item };
      // Remove email from public share view
      delete itemCopy.purchasedByEmail;
      return itemCopy;
    });
    
    res.json({
      id: kid.id,
      name: kid.name,
      wishlist: wishlist
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shared wishlist' });
  }
});

// Generate or regenerate share token for a kid
app.post('/api/kids/:kidId/share-token', authenticateToken, async (req, res) => {
  try {
    const { kidId } = req.params;
    
    const data = await readData();
    const kid = data.kids.find(k => k.id === kidId);
    
    if (!kid) {
      return res.status(404).json({ error: 'Kid not found' });
    }
    
    // Check ownership
    if (kid.userId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to manage this list' });
    }
    
    kid.shareToken = generateShareToken();
    await writeData(data);
    
    res.json({ shareToken: kid.shareToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate share token' });
  }
});

// Search for wishlists by parent email or user ID
app.get('/api/search', async (req, res) => {
  try {
    const { email, userId } = req.query;
    
    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or userId is required' });
    }
    
    const data = await readData();
    const usersData = await readUsers();
    
    let targetUserId = null;
    
    // If email provided, find user by email
    if (email) {
      const user = usersData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.json({ kids: [] }); // Return empty array if user not found
      }
      targetUserId = user.id;
    } else {
      targetUserId = userId;
    }
    
    // Find all kids for this user
    const kids = data.kids.filter(kid => kid.userId === targetUserId);
    
    // Return only public info (name and share token for viewing)
    const publicKids = kids.map(kid => ({
      id: kid.id,
      name: kid.name,
      shareToken: kid.shareToken,
      itemCount: kid.wishlist ? kid.wishlist.length : 0
    }));
    
    res.json({ kids: publicKids });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search wishlists' });
  }
});

// Initialize server
async function startServer() {
  try {
    // Verify we're in the correct directory structure
    const projectRoot = path.join(__dirname, '..');
    const expectedPackageJson = path.join(projectRoot, 'package.json');
    
    try {
      await fs.access(expectedPackageJson);
      console.log('✓ Project structure verified');
    } catch (error) {
      console.error('⚠️  Warning: Could not verify project structure at:', expectedPackageJson);
      console.error('   Current __dirname:', __dirname);
      console.error('   This may cause issues if paths are incorrect.');
    }
    
    console.log('Initializing data directories...');
    await ensureDataDir();
    
    console.log('Initializing users file...');
    await initializeUsers();
    
    console.log('Initializing data file...');
    await initializeData();
    
    // Ensure uploads directory exists
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      console.log('✓ Uploads directory ready');
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
    
    // Start server with better error handling
    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use.`);
        console.error('   Another server instance may be running.');
        console.error('   To fix this:');
        console.error(`   1. Find the process: lsof -ti :${PORT}`);
        console.error(`   2. Kill it: kill -9 $(lsof -ti :${PORT})`);
        console.error('   3. Or stop any other instances of npm run dev\n');
        process.exit(1);
      } else {
        console.error('Server error:', error);
        throw error;
      }
    });
    
    console.log('✓ Server initialization complete');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Root route - API info
app.get('/', (req, res) => {
  res.json({ 
    message: 'The Happy Haul API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login, /api/auth/me',
      kids: '/api/kids',
      search: '/api/search',
      share: '/api/share/:shareToken'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server with error handling
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  console.error('Error stack:', error.stack);
  process.exit(1);
});

