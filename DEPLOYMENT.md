# Deployment Guide

This guide will help you deploy The Happy Haul to production.

## Architecture

- **Frontend**: Deployed on Vercel
- **Backend**: Deployed separately on Railway (or similar service)

## Step 1: Deploy Backend to Railway

### Option A: Railway (Recommended)

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `TheHappyHaul` repository
4. Railway will auto-detect the Node.js app
5. Configure the service:
   - **Root Directory**: Leave as root (`.`)
   - **Start Command**: `node server/index.js` (should auto-detect)
6. Add Environment Variables:
   - `JWT_SECRET`: Generate a secure random string (you can use: `openssl rand -base64 32`)
   - `PORT`: Railway will set this automatically
7. Click "Deploy"
8. Once deployed, copy your Railway app URL (e.g., `https://your-app.railway.app`)

### Option B: Render

1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `the-happy-haul-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
5. Add Environment Variables:
   - `JWT_SECRET`: Generate a secure random string
6. Click "Create Web Service"
7. Copy your Render URL (e.g., `https://your-app.onrender.com`)

## Step 2: Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project" → Import your `TheHappyHaul` repository
3. Configure the project:
   - **Framework Preset**: Vite (or Other if Vite not available)
   - **Root Directory**: `./` (root)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/dist`
4. **Important**: Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: Your backend URL from Step 1 (e.g., `https://your-app.railway.app`)
   - **Note**: Do NOT include `/api` in the URL - the code will add that automatically
5. Click "Deploy"

## Step 3: Update CORS on Backend

Your backend needs to allow requests from your Vercel frontend domain.

The backend already has CORS enabled with `app.use(cors())`, which allows all origins. For production, you may want to restrict this to your Vercel domain.

## Step 4: Test the Deployment

1. Visit your Vercel frontend URL
2. Try registering a new account
3. Try adding a kid and items
4. Check that all API calls are working

## Troubleshooting

### Frontend can't connect to backend
- Check that `VITE_API_URL` is set correctly in Vercel
- Make sure the backend URL doesn't include `/api` at the end
- Verify CORS is enabled on the backend

### Backend not starting
- Check Railway/Render logs for errors
- Verify `JWT_SECRET` is set
- Make sure `package.json` has a `start` script

### File uploads not working
- Railway and Render have ephemeral file systems
- Consider using cloud storage (S3, Cloudinary) for production
- The current setup uses local file storage which won't persist

## Production Considerations

1. **Database**: Consider migrating from JSON files to a real database (MongoDB, PostgreSQL)
2. **File Storage**: Use cloud storage (AWS S3, Cloudinary) for uploaded images
3. **Environment Variables**: Keep secrets secure and never commit them
4. **HTTPS**: Both Vercel and Railway provide HTTPS by default

