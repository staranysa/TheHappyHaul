import React, { useState } from 'react';
import { api } from '../contexts/AuthContext';
import './ShareButton.css';

function ShareButton({ kid, onTokenGenerated }) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${kid.shareToken}`;
  };

  const handleCopyLink = async () => {
    try {
      // Ensure kid has a share token
      let shareToken = kid.shareToken;
      
      if (!shareToken) {
        // Generate a new share token
        const response = await api.post(`/kids/${kid.id}/share-token`);
        shareToken = response.data.shareToken;
        if (onTokenGenerated) {
          onTokenGenerated(shareToken);
        }
      }

      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  return (
    <div className="share-button-container">
      <button
        className="share-btn"
        onClick={() => setShowShareMenu(!showShareMenu)}
        aria-label="Share wishlist"
      >
        🔗 Share List
      </button>
      
      {showShareMenu && (
        <div className="share-menu">
          <div className="share-menu-content">
            <h3>Share {kid.name}'s Wishlist</h3>
            <p className="share-description">
              Anyone with this link can view the wishlist:
            </p>
            <div className="share-url-container">
              <input
                type="text"
                readOnly
                value={kid.shareToken ? getShareUrl() : 'Generating link...'}
                className="share-url-input"
              />
              <button
                className="copy-btn"
                onClick={handleCopyLink}
                disabled={copied}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <button
              className="close-share-menu-btn"
              onClick={() => setShowShareMenu(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareButton;

