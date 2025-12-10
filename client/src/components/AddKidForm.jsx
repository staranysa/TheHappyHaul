import React, { useState } from 'react';
import './AddKidForm.css';

function AddKidForm({ onAdd }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), age.trim() || null);
      setName('');
      setAge('');
      setIsExpanded(false);
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
      <input
        type="number"
        placeholder="Age (optional)"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        min="0"
        max="18"
        className="add-kid-input"
      />
      <div className="add-kid-actions">
        <button type="submit" className="submit-btn">
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setName('');
            setAge('');
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

