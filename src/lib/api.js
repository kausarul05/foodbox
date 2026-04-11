// API Base URL configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Get token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userToken');
  }
  return null;
};

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Menu APIs
export const menuAPI = {
  // Get menu by package
  getMenuByPackage: (packageType) => {
    return apiCall(`/menu/package/${packageType}`);
  },
};

// Package APIs
export const packageAPI = {
  // Get all packages
  getAllPackages: () => {
    return apiCall('/packages');
  },
};

// Auth APIs
export const authAPI = {
  // User login
  userLogin: (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // User register
  userRegister: (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Get user profile
  getUserProfile: () => {
    return apiCall('/auth/profile');
  },

  // Update user profile
  updateUserProfile: (userData) => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Logout
  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  },
};

// Order APIs
export const orderAPI = {
  // Create order
  createOrder: (orderData) => {
    return apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  // Get my orders
  getMyOrders: () => {
    return apiCall('/orders/myorders');
  },
};

// Subscription APIs
export const subscriptionAPI = {
  // Request subscription
  requestSubscription: (subscriptionData) => {
    return apiCall('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData),
    });
  },

  // Get my subscriptions
  getMySubscriptions: () => {
    return apiCall('/subscriptions/my');
  },
};

export default {
  menu: menuAPI,
  packages: packageAPI,
  auth: authAPI,
  orders: orderAPI,
  subscriptions: subscriptionAPI,
};