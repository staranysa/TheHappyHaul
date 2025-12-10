import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ShareView from './components/ShareView';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import SearchWishlist from './components/SearchWishlist';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/search" element={<SearchWishlist />} />
      <Route path="/share/:shareToken" element={<ShareView />} />
    </Routes>
  );
}

export default App;

