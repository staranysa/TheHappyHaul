import React, { useState } from 'react';
import { api } from '../contexts/AuthContext';
import './KidCard.css';
import AddItemForm from './AddItemForm';
import WishlistItem from './WishlistItem';
import ShareButton from './ShareButton';

function KidCard({ kid, onDelete, onUpdate, isAuthenticated = false }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleAddItem = async (itemData) => {
    try {
      await api.post(`/kids/${kid.id}/items`, itemData);
      onUpdate();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding item:', error);
      alert(error.response?.data?.error || 'Failed to add item. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/kids/${kid.id}/items/${itemId}`);
      onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(error.response?.data?.error || 'Failed to delete item. Please try again.');
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      await api.put(`/kids/${kid.id}/items/${itemId}`, updates);
      onUpdate();
    } catch (error) {
      console.error('Error updating item:', error);
      alert(error.response?.data?.error || 'Failed to update item. Please try again.');
    }
  };

  const handleTokenGenerated = async (newToken) => {
    // Refresh kid data to get the new token
    onUpdate();
  };

  return (
    <div className="kid-card">
      <div className="kid-card-header">
        <div className="kid-name-section">
          <h2>{kid.name}</h2>
          <span className="item-count">{kid.wishlist.length} items</span>
        </div>
        <div className="kid-card-actions">
          <ShareButton kid={kid} onTokenGenerated={handleTokenGenerated} />
          <button
            className="toggle-btn"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▼' : '▶'}
          </button>
          {isAuthenticated && (
            <button
              className="delete-kid-btn"
              onClick={() => onDelete(kid.id)}
              aria-label="Delete kid"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="kid-card-content">
          {kid.wishlist.length === 0 ? (
            <div className="empty-wishlist">
              <p>No items yet. Add something to {kid.name}'s wishlist!</p>
            </div>
          ) : (
            <div className="wishlist-items">
              {kid.wishlist.map(item => (
                <WishlistItem
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteItem}
                  onUpdate={handleUpdateItem}
                  readOnly={!isAuthenticated}
                />
              ))}
            </div>
          )}

          {isAuthenticated && (
            showAddForm ? (
              <AddItemForm
                onSubmit={handleAddItem}
                onCancel={() => setShowAddForm(false)}
              />
            ) : (
              <button
                className="add-item-btn"
                onClick={() => setShowAddForm(true)}
              >
                + Add Item
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default KidCard;

