import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SearchWishlist.css';

const API_BASE = '/api';

function SearchWishlist() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('email'); // 'email' or 'userId'
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);
    
    if (!searchTerm.trim()) {
      setError('Please enter an email or user ID');
      return;
    }
    
    setLoading(true);
    
    try {
      const queryParam = searchType === 'email' ? 'email' : 'userId';
      const response = await axios.get(`${API_BASE}/search?${queryParam}=${encodeURIComponent(searchTerm.trim())}`);
      setResults(response.data);
      
      if (response.data.kids.length === 0) {
        setError('No wishlists found for this ' + (searchType === 'email' ? 'email' : 'user ID'));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search wishlists');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewWishlist = (shareToken) => {
    navigate(`/share/${shareToken}`);
  };

  return (
    <div className="search-wishlist-container">
      <div className="search-wishlist-card">
        <h2>Find a Wishlist</h2>
        <p className="search-description">
          Enter the parent's email or user ID to find their kids' wishlists
        </p>
        
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-type-selector">
            <label>
              <input
                type="radio"
                value="email"
                checked={searchType === 'email'}
                onChange={(e) => setSearchType(e.target.value)}
              />
              Email
            </label>
            <label>
              <input
                type="radio"
                value="userId"
                checked={searchType === 'userId'}
                onChange={(e) => setSearchType(e.target.value)}
              />
              User ID
            </label>
          </div>
          
          <input
            type={searchType === 'email' ? 'email' : 'text'}
            placeholder={searchType === 'email' ? 'Enter parent email' : 'Enter user ID'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            required
          />
          
          <button type="submit" disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        {error && <div className="search-error">{error}</div>}
        
        {results && results.kids.length > 0 && (
          <div className="search-results">
            <h3>Found {results.kids.length} {results.kids.length === 1 ? 'wishlist' : 'wishlists'}:</h3>
            <div className="kids-list">
              {results.kids.map(kid => (
                <div key={kid.id} className="kid-result-card">
                  <div className="kid-result-info">
                    <h4>{kid.name}{kid.age && <span className="kid-age"> ({kid.age})</span>}</h4>
                    <p className="item-count-text">{kid.itemCount} {kid.itemCount === 1 ? 'item' : 'items'}</p>
                  </div>
                  <button
                    onClick={() => handleViewWishlist(kid.shareToken)}
                    className="view-wishlist-btn"
                  >
                    View Wishlist
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchWishlist;

