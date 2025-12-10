# The Happy Haul 🎁

A beautiful web application to manage wishlists for your kids. Keep track of items they want, with descriptions, links, and priority levels.

## Features

- ✨ Add multiple kids and manage separate wishlists for each
- 📝 Add items with name, description, URL, and priority level
- ✏️ Edit and delete items
- 🎨 Beautiful, modern UI with gradient design
- 📱 Responsive design that works on mobile and desktop
- 💾 Data persists in JSON file

## Getting Started

### Prerequisites

- Node.js (v14 or higher) and npm (comes with Node.js)

**Installing Node.js:**

If you don't have Node.js installed, you can install it in one of these ways:

1. **Download from official website** (Recommended):
   - Visit https://nodejs.org/
   - Download the LTS (Long Term Support) version for macOS
   - Run the installer and follow the instructions
   - Restart your terminal after installation

2. **Using Homebrew** (if you have it installed):
   ```bash
   brew install node
   ```

After installation, verify it's working:
```bash
node --version
npm --version
```

You should see version numbers for both commands.

### Installation

1. Install all dependencies (both root and client):
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd client
npm install
cd ..
```

### Running the App

Start both the backend server and frontend client:
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend client on `http://localhost:3000`

Open your browser and navigate to `http://localhost:3000`

### Individual Commands

- Start only the backend server:
```bash
npm run server
```

- Start only the frontend client:
```bash
npm run client
```

## Usage

1. **Add a Kid**: Click "Add New Kid" and enter their name
2. **Add Items**: Click "+ Add Item" in a kid's card to add wishlist items
3. **Edit Items**: Click the edit icon (✎) on any item to modify it
4. **Delete Items**: Click the delete icon (✕) on any item or kid
5. **View Links**: Click "🔗 View Link" to open item URLs in a new tab

## Project Structure

```
kids-wishlist/
├── server/
│   ├── index.js          # Express backend server
│   └── data/             # Data storage (created automatically)
│       └── wishlist.json # JSON file storing all data
├── client/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── package.json
└── package.json
```

## API Endpoints

- `GET /api/kids` - Get all kids and their wishlists
- `POST /api/kids` - Add a new kid
- `DELETE /api/kids/:kidId` - Delete a kid
- `POST /api/kids/:kidId/items` - Add item to kid's wishlist
- `PUT /api/kids/:kidId/items/:itemId` - Update an item
- `DELETE /api/kids/:kidId/items/:itemId` - Delete an item

## Technologies Used

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Storage**: JSON file
- **Styling**: CSS3 with modern gradients and animations

## Troubleshooting

### "command not found: npm" or "command not found: node"
- **Solution**: Node.js is not installed. See the Prerequisites section above for installation instructions.
- After installing Node.js, restart your terminal and try again.

### Port already in use errors
- If port 3000 or 3001 is already in use, you can change them:
  - Backend: Set `PORT` environment variable: `PORT=3002 npm run server`
  - Frontend: Edit `client/vite.config.js` and change the port number

### Module not found errors
- Make sure you've installed all dependencies:
  ```bash
  npm run install-all
  ```

### CORS errors
- Make sure both the backend (port 3001) and frontend (port 3000) are running
- The frontend proxy is configured in `client/vite.config.js`

### Data not persisting
- Check that `server/data/wishlist.json` exists and is writable
- The data directory is created automatically on first run

## License

MIT

