'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '@/app/admin/lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if admin is logged in on mount
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.adminLogin(email, password);
      
      if (response.success) {
        const { token, ...adminData } = response.data;
        
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminData', JSON.stringify(adminData));
        
        setAdmin(adminData);
        toast.success('লগইন সফল!');
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'লগইন ব্যর্থ হয়েছে!');
      return false;
    }
  };

  const logout = () => {
    authAPI.logout();
    setAdmin(null);
    toast.success('লগআউট সফল!');
    window.location.href = '/admin/login';
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};