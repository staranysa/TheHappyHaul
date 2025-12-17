// API configuration
// On Railway, both frontend and backend are served from the same domain
// So we use relative paths (/api) by default
// If you need to override (e.g., separate backend), set VITE_API_URL environment variable
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

