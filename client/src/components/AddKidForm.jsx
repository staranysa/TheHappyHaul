import React, { useState } from 'react';
import './AddKidForm.css';

function AddKidForm({ onAdd }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && privacyAcknowledged) {
      onAdd(name.trim(), age.trim() || null);
      setName('');
      setAge('');
      setIsExpanded(false);
      setPrivacyAcknowledged(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="add-kid-form-container">
        <button
          className="expand-add-kid-btn"
          onClick={() => setIsExpanded(true)}
        >
          + Add New Kid
        </button>
      </div>
    );
  }

  return (
    <form className="add-kid-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter kid's name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="add-kid-input"
        required
      />
      <p className="privacy-hint">💡 Tip: Use nicknames or initials only (e.g., "Little J" instead of "Jennifer Smith")</p>
      <input
        type="number"
        placeholder="Age (optional)"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        min="0"
        max="18"
        className="add-kid-input"
      />
      <label className="privacy-checkbox">
        <input
          type="checkbox"
          checked={privacyAcknowledged}
          onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
          required
        />
        <span>I understand this is a public wishlist app and will not include personal or sensitive information.</span>
      </label>
      <div className="add-kid-actions">
        <button type="submit" className="submit-btn" disabled={!privacyAcknowledged}>
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setName('');
            setAge('');
            setPrivacyAcknowledged(false);
          }}
          className="cancel-btn"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddKidForm;

