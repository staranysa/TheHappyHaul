import React, { useState } from 'react';
import { api } from '../contexts/AuthContext';
import './AddItemForm.css';
import { API_BASE } from '../config/api';

function AddItemForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    imageUrl: '',
    priority: 'medium'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const previousName = formData.name;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Automatically fetch and populate name and image from URL when URL is entered
    if (name === 'url' && value && value.startsWith('http')) {
      if (!previousName.trim()) {
        fetchProductTitle(value);
      }
      // Always try to fetch image when URL changes
      fetchProductImage(value);
    }
  };
  
  const fetchProductTitle = async (url) => {
    if (!url || !url.startsWith('http')) {
      return;
    }
    
    setFetchingTitle(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/extract-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          // Only set the name if it's still empty (user hasn't typed anything)
          setFormData(prev => {
            if (!prev.name.trim()) {
              return {
                ...prev,
                name: data.title
              };
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching product title:', error);
    } finally {
      setFetchingTitle(false);
    }
  };

  const fetchProductImage = async (url) => {
    if (!url || !url.startsWith('http')) {
      return;
    }
    
    setFetchingImage(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/extract-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          setFormData(prev => ({
            ...prev,
            imageUrl: data.imageUrl
          }));
          // Show preview of extracted image
          setImagePreview(data.imageUrl);
          // Clear any uploaded file since we have an extracted image
          setImageFile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching product image:', error);
    } finally {
      setFetchingImage(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Clear extracted image preview
      setFormData(prev => ({ ...prev, imageUrl: '' }));
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      let finalImageUrl = formData.imageUrl;
      
      // Upload image file if provided
      if (imageFile) {
        setUploading(true);
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('image', imageFile);
          
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE}/upload-image`, {
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
            setUploading(false);
            return;
          }
        } catch (error) {
          console.error('Upload error:', error);
          alert('Failed to upload image. Please try again.');
          setUploading(false);
          return;
        }
        setUploading(false);
      }
      
      onSubmit({ ...formData, imageUrl: finalImageUrl });
      setFormData({
        name: '',
        description: '',
        url: '',
        imageUrl: '',
        priority: 'medium'
      });
      setImageFile(null);
      setImagePreview(null);
    }
  };

  return (
    <form className="add-item-form" onSubmit={handleSubmit}>
      <p className="privacy-note">
        🔓 Note: This wishlist will be shared. Avoid adding personal notes or identifying information.
      </p>
      <input
        type="url"
        name="url"
        placeholder="Product Link/URL (optional)"
        value={formData.url}
        onChange={handleChange}
        className="form-input"
      />
      <div className="name-input-wrapper">
        <input
          type="text"
          name="name"
          placeholder="Item name *"
          value={formData.name}
          onChange={handleChange}
          required
          className="form-input"
        />
        {fetchingTitle && (
          <span className="fetching-indicator-inline">Fetching...</span>
        )}
      </div>
      <textarea
        name="description"
        placeholder="Description (optional)"
        value={formData.description}
        onChange={handleChange}
        rows="2"
        className="form-textarea"
      />
      
      {/* Show image preview if available */}
      {fetchingImage && (
        <div className="fetching-indicator">🖼️ Fetching image from URL...</div>
      )}
      {imagePreview && (
        <div className="image-preview-container">
          <img src={imagePreview} alt="Preview" className="image-preview" />
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({ ...prev, imageUrl: '' }));
              setImagePreview(null);
              setImageFile(null);
            }}
            className="remove-image-btn"
          >
            Remove
          </button>
        </div>
      )}
      
      {/* Make upload section less prominent - collapsible */}
      <details className="image-upload-details">
        <summary className="image-upload-summary">Upload Image (optional)</summary>
        <div className="image-upload-section">
          <label className="image-upload-label">
            Choose file
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="image-file-input"
            />
          </label>
        </div>
      </details>
      <select
        name="priority"
        value={formData.priority}
        onChange={handleChange}
        className="form-select"
      >
        <option value="low">low priority</option>
        <option value="medium">medium priority</option>
        <option value="high">high priority</option>
      </select>
      <div className="form-actions">
        <button type="submit" disabled={uploading} className="submit-item-btn">
          {uploading ? 'Uploading...' : 'Add Item'}
        </button>
        <button type="button" onClick={onCancel} className="cancel-item-btn">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddItemForm;

