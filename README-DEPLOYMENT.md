# Deployment Guide

This guide explains how to deploy The Happy Haul app with the frontend on Vercel and backend on Railway/Render.

## Architecture

- **Frontend**: Deployed on Vercel (React + Vite)
- **Backend**: Deployed separately on Railway or Render (Express API)

## Backend Deployment Options

### Option 1: Railway (Recommended - Easiest)

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with your GitHub account

2. **Create a New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `TheHappyHaul` repository
   - Railway will auto-detect the Node.js app

3. **Configure Environment Variables**
   - In Railway dashboard, go to your service → Variables
   - Add these variables:
     ```
     JWT_SECRET=your-strong-random-secret-key-here
     FRONTEND_URL=https://thehappyhaul.vercel.app
     NODE_ENV=production
     ```
   - Generate a strong JWT_SECRET (you can use: `openssl rand -base64 32`)

4. **Deploy**
   - Railway will automatically deploy when you push to GitHub
   - Note your backend URL (e.g., `https://your-app.railway.app`)

### Option 2: Render

1. **Sign up for Render**
   - Go to https://render.com
   - Sign up with your GitHub account

2. **Create a New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select `TheHappyHaul` repository

3. **Configure Settings**
   - **Name**: `the-happy-haul-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: Leave empty (root)

4. **Add Environment Variables**
   - Go to Environment tab
   - Add:
     ```
     JWT_SECRET=your-strong-random-secret-key-here
     FRONTEND_URL=https://thehappyhaul.vercel.app
     NODE_ENV=production
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Note your backend URL (e.g., `https://your-app.onrender.com`)

## Frontend Deployment (Vercel)

1. **Deploy to Vercel**
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will auto-detect the Vite app

2. **Add Environment Variable**
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-backend-url.railway.app
     ```
     (Replace with your actual backend URL from Railway/Render)

3. **Redeploy**
   - After adding the environment variable, trigger a new deployment
   - Your frontend will now connect to your backend

## Testing the Deployment

1. **Test Backend**
   - Visit: `https://your-backend-url.railway.app/api/kids`
   - Should return JSON (empty array if no data)

2. **Test Frontend**
   - Visit: `https://thehappyhaul.vercel.app`
   - Try registering/logging in
   - API calls should work if environment variables are set correctly

## Troubleshooting

### CORS Errors
- Make sure `FRONTEND_URL` in backend matches your Vercel URL exactly
- Check that CORS is configured correctly in `server/index.js`

### 404 Errors on API Calls
- Verify `VITE_API_URL` is set in Vercel environment variables
- Make sure the backend URL is correct and includes `https://`
- Check browser console for the actual API URL being used

### Authentication Issues
- Ensure `JWT_SECRET` is the same if you're using multiple backend instances
- Check that tokens are being sent in request headers

## File Uploads

**Important**: The current setup uses local file storage (`server/uploads/`), which won't persist on most hosting platforms. For production, consider:

- **Cloudinary** (recommended for images)
- **AWS S3**
- **Railway Volumes** (if using Railway)

Update `server/index.js` to use cloud storage for production.

