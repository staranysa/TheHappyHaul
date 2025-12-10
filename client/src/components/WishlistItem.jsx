import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WishlistItem.css';

function WishlistItem({ item, onDelete, onUpdate, readOnly = false, allowPurchase = false }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: item.name,
    description: item.description || '',
    url: item.url || '',
    imageUrl: item.imageUrl || '',
    priority: item.priority || 'medium',
    purchased: item.purchased || false,
    purchasedBy: item.purchasedBy || ''
  });
  const [purchasedByInput, setPurchasedByInput] = useState(item.purchasedBy || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    let finalImageUrl = editData.imageUrl;
    
    // Upload image file if provided
    if (imageFile) {
      setUploadingImage(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append('image', imageFile);
        
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataUpload
        });
        
        if (response.ok) {
          const data = await response.json();
          finalImageUrl = data.imageUrl;
        } else {
          alert('Failed to upload image. Please try again.');
          setUploadingImage(false);
          return;
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image. Please try again.');
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }
    
    const payload = {
      ...editData,
      imageUrl: finalImageUrl,
      // Ensure purchasedBy is cleared if unchecked
      purchasedBy: editData.purchased ? editData.purchasedBy : ''
    };
    onUpdate(item.id, payload);
    setIsEditing(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCancel = () => {
    setEditData({
      name: item.name,
      description: item.description || '',
      url: item.url || '',
      imageUrl: item.imageUrl || '',
      priority: item.priority || 'medium',
      purchased: item.purchased || false,
      purchasedBy: item.purchasedBy || ''
    });
    setIsEditing(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleInlinePurchasedToggle = (checked) => {
    if (!checked) {
      // If unchecking, clear everything
      setPurchasedByInput('');
      onUpdate(item.id, {
        purchased: false,
        purchasedBy: ''
      });
    } else {
      // If checking, set purchased to true but don't submit yet
      // This will show the form
      onUpdate(item.id, {
        purchased: true,
        purchasedBy: purchasedByInput || ''
      });
    }
  };

  const handleInlinePurchasedByChange = (value) => {
    setPurchasedByInput(value);
  };

  const handlePurchaseSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate(item.id, {
        purchased: true,
        purchasedBy: purchasedByInput
      });
      // Only navigate to home if not in share view (allowPurchase means share view)
      if (!allowPurchase) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error submitting purchase:', error);
      alert('Failed to submit purchase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update local state when item prop changes
  useEffect(() => {
    setPurchasedByInput(item.purchasedBy || '');
  }, [item.purchasedBy]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#e74c3c';
      case 'medium':
        return '#f39c12';
      case 'low':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'low': 'low priority',
      'medium': 'medium priority',
      'high': 'high priority'
    };
    return labels[priority] || priority;
  };

  if (isEditing && !readOnly) {
    return (
      <div className="wishlist-item editing">
        <input
          type="text"
          value={editData.name}
          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          className="edit-input"
          placeholder="Item name"
        />
        <textarea
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          className="edit-textarea"
          placeholder="Description"
          rows="2"
        />
        <input
          type="url"
          value={editData.url}
          onChange={(e) => setEditData({ ...editData, url: e.target.value })}
          className="edit-input"
          placeholder="Product URL"
        />
        <div className="image-upload-section">
          <label className="image-upload-label">
            Upload Image (optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="image-file-input"
            />
          </label>
          {imagePreview && (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Preview" className="image-preview" />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="remove-image-btn"
              >
                Remove
              </button>
            </div>
          )}
          {!imagePreview && item.imageUrl && (
            <div className="current-image-preview">
              <p>Current image:</p>
              <img src={item.imageUrl} alt="Current" className="image-preview" />
            </div>
          )}
        </div>
        <input
          type="url"
          value={editData.imageUrl}
          onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
          className="edit-input"
          placeholder="Or enter Image URL (optional - or will auto-extract from product URL)"
        />
        <select
          value={editData.priority}
          onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
          className="edit-select"
        >
          <option value="low">low priority</option>
          <option value="medium">medium priority</option>
          <option value="high">high priority</option>
        </select>
        <label className="purchase-toggle">
          <input
            type="checkbox"
            checked={editData.purchased}
            onChange={(e) => setEditData({ ...editData, purchased: e.target.checked })}
          />
          Mark as purchased
        </label>
        {editData.purchased && (
          <input
            type="text"
            value={editData.purchasedBy}
            onChange={(e) => setEditData({ ...editData, purchasedBy: e.target.value })}
            className="edit-input"
            placeholder="Who bought it?"
          />
        )}
        <div className="edit-actions">
          <button onClick={handleSave} disabled={uploadingImage} className="save-btn">
            {uploadingImage ? 'Uploading...' : 'Save'}
          </button>
          <button onClick={handleCancel} className="cancel-edit-btn">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-item">
      <div className="item-header">
        <div className="item-title">
          <h3 className="item-name">{item.name}</h3>
          {item.purchased && (
            <span className="purchased-badge">
              {purchasedByInput ? `Purchased by ${purchasedByInput}` : 'PURCHASED'}
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="item-actions">
            <button
              onClick={() => setIsEditing(true)}
              className="edit-btn"
              aria-label="Edit item"
            >
              ✎
            </button>
            <button
              onClick={() => {
                if (confirm('Delete this item?')) {
                  onDelete(item.id);
                }
              }}
              className="delete-item-btn"
              aria-label="Delete item"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      
      {item.description && (
        <p className="item-description">{item.description}</p>
      )}
      
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="item-url"
        >
          🔗 Buy it here
        </a>
      )}
      
      {item.imageUrl && (
        <div className="item-image-container">
          <img 
            src={item.imageUrl} 
            alt={item.name}
            className="item-image"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          {item.purchased && (
            <div className="purchased-overlay">
              PURCHASED
            </div>
          )}
        </div>
      )}
      
      <div className="item-footer">
        <span
          className="priority-badge"
          style={{ backgroundColor: getPriorityColor(item.priority) }}
        >
          {getPriorityLabel(item.priority)}
        </span>
        {item.addedAt && (
          <span className="item-date">
            Added {new Date(item.addedAt).toLocaleDateString()}
          </span>
        )}
        {item.purchasedAt && (
          <span className="item-date">
            Purchased {new Date(item.purchasedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {(!readOnly || allowPurchase) && (
        <div className="inline-purchase-row">
          <label className="purchase-inline-toggle">
            <input
              type="checkbox"
              checked={item.purchased || false}
              onChange={(e) => handleInlinePurchasedToggle(e.target.checked)}
            />
            Mark as purchased
          </label>
          {item.purchased && !item.purchasedBy && (
            <div className="purchase-form">
              <input
                type="text"
                value={purchasedByInput}
                onChange={(e) => handleInlinePurchasedByChange(e.target.value)}
                className="purchased-by-input"
                placeholder="Who bought it? eg: Grandma Sue or Uncle Mike"
              />
              <button
                onClick={handlePurchaseSubmit}
                disabled={isSubmitting}
                className="submit-purchase-btn"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WishlistItem;

