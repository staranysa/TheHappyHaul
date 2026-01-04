import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
import '../App.css';
import KidCard from '../components/KidCard';
import AddKidForm from '../components/AddKidForm';

function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [kids, setKids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKids();
  }, [isAuthenticated]);

  const fetchKids = async () => {
    try {
      const response = await api.get('/kids');
      setKids(response.data);
    } catch (error) {
      console.error('Error fetching kids:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKid = async (name) => {
    if (!isAuthenticated) {
      alert('Please login to add kids');
      return;
    }
    try {
      const response = await api.post('/kids', { name });
      setKids([...kids, response.data]);
    } catch (error) {
      console.error('Error adding kid:', error);
      alert(error.response?.data?.error || 'Failed to add kid. Please try again.');
    }
  };

  const handleDeleteKid = async (kidId) => {
    if (!confirm('Are you sure you want to delete this kid and all their wishlist items?')) {
      return;
    }
    try {
      await api.delete(`/kids/${kidId}`);
      setKids(kids.filter(k => k.id !== kidId));
    } catch (error) {
      console.error('Error deleting kid:', error);
      alert(error.response?.data?.error || 'Failed to delete kid. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading wishlists...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <img src="/logo.png?v=3" alt="The Happy Haul Logo" className="app-logo" />
        </div>
        <h1>The Happy Haul</h1>
        <p>A No-Nonsense Wishlist</p>
        <div className="auth-status">
          {isAuthenticated ? (
            <div className="user-info">
              <span>Logged in as {user?.email}</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="auth-link">Login</Link>
              <span> or </span>
              <Link to="/register" className="auth-link">Create Account</Link>
            </div>
          )}
        </div>
        <div className="find-wishlist-section">
          <Link to="/search" className="find-wishlist-btn">
            🔍 Find a Wishlist
          </Link>
        </div>
      </header>

      {isAuthenticated && <AddKidForm onAdd={handleAddKid} />}

      <div className="kids-container">
        {kids.length === 0 ? (
          <div className="empty-state">
            <p>
              {isAuthenticated 
                ? "No kids added yet. Add your first kid to get started!"
                : "Login to create and manage wishlists for your kids!"}
            </p>
          </div>
        ) : (
          kids.map(kid => (
            <KidCard
              key={kid.id}
              kid={kid}
              onDelete={handleDeleteKid}
              onUpdate={fetchKids}
              isAuthenticated={isAuthenticated}
            />
          ))
        )}
      </div>
      
      <footer className="app-footer">
        <a 
          href="https://ko-fi.com/hannahbanana127" 
          target="_blank" 
          rel="noopener noreferrer"
          className="support-link"
        >
          Support the developer, buy her a coffee ☕
        </a>
      </footer>
    </div>
  );
}

export default Home;

