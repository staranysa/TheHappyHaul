import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ShareView.css';
import WishlistItem from './WishlistItem';
import { API_BASE } from '../config/api';
// ShareView uses regular axios since it's a public route

function ShareView() {
  const { shareToken } = useParams();
  const [kid, setKid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSharedWishlist();
  }, [shareToken]);

  const fetchSharedWishlist = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/share/${shareToken}`);
      setKid(response.data);
      setError(null);
    } catch (err) {
      setError('Wishlist not found or link is invalid.');
      setKid(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      await axios.put(`${API_BASE}/kids/${kid.id}/items/${itemId}`, updates);
      // Refresh the shared wishlist
      fetchSharedWishlist();
    } catch (error) {
      console.error('Error updating item:', error);
      alert(error.response?.data?.error || 'Failed to update item. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="share-view">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading wishlist...</p>
        </div>
      </div>
    );
  }

  if (error || !kid) {
    return (
      <div className="share-view">
        <div className="error-container">
          <h2>Oops!</h2>
          <p>{error || 'Wishlist not found'}</p>
          <Link to="/" className="home-link">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="share-view">
      <header className="share-header">
        <div className="logo-container">
          <img src="/logo.png?v=3" alt="The Happy Haul Logo" className="app-logo" />
        </div>
        <h1>The Happy Haul</h1>
        <p className="share-subtitle">Shared Wishlist</p>
      </header>

      <div className="shared-wishlist-container">
        <div className="shared-kid-card">
          <div className="shared-kid-header">
            <h2>{kid.name}'s Wishlist</h2>
            <span className="item-count">{kid.wishlist.length} items</span>
          </div>

          {kid.wishlist.length === 0 ? (
            <div className="empty-wishlist">
              <p>No items in this wishlist yet.</p>
            </div>
          ) : (
            <div className="wishlist-items">
              {kid.wishlist.map(item => (
                <WishlistItem
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateItem}
                  readOnly={true}
                  allowPurchase={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="share-footer">
        <Link to="/" className="home-link">
          ← Create your own wishlist
        </Link>
        <a 
          href="https://ko-fi.com/hannahbanana127" 
          target="_blank" 
          rel="noopener noreferrer"
          className="support-link-share"
        >
          Support the developer, buy her a coffee ☕
        </a>
      </div>
    </div>
  );
}

export default ShareView;

