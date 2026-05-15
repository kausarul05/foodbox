// API Base URL configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Get token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userToken')
  }
  return null
}

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken()

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('userToken')
        localStorage.removeItem('userData')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
      throw new Error(data.message || 'Something went wrong')
    }

    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Menu APIs
export const menuAPI = {
  // Get menu by package
  getMenuByPackage: packageType => {
    return apiCall(`/menu/package/${packageType}`)
  }
}

// Package APIs
export const packageAPI = {
  // Get all packages
  getAllPackages: () => {
    return apiCall('/packages')
  }
}

// Auth APIs
export const authAPI = {
  // User login with phone number
  userLogin: (phoneNumber, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password })
    })
  },

  // User register
  userRegister: userData => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  // Get user profile
  getUserProfile: () => {
    return apiCall('/auth/profile')
  },

  // Update user profile
  updateUserProfile: userData => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  },

  // Logout
  logout: () => {
    localStorage.removeItem('userToken')
    localStorage.removeItem('userData')
  }
}

// Order APIs
export const orderAPI = {
  // Create order
  createOrder: orderData => {
    return apiCall('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    })
  },

  // Cancel order
  cancelOrder: (orderId, reason) => {
    return apiCall(`/orders/${orderId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    })
  },

  // Get my orders
  getMyOrders: () => {
    return apiCall('/orders/myorders')
  },

  // Check if order is within deadline
  checkDeadline: (deliveryDate, deliveryTime) => {
    return apiCall('/orders/check-deadline', {
      method: 'POST',
      body: JSON.stringify({ deliveryDate, deliveryTime })
    })
  }
}

// Subscription APIs
export const subscriptionAPI = {
  // Request subscription
  requestSubscription: subscriptionData => {
    return apiCall('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscriptionData)
    })
  },

  // Get my subscriptions
  getMySubscriptions: () => {
    return apiCall('/subscriptions/my')
  }
}

// Wallet APIs
export const walletAPI = {
  getBalance: () => {
    return apiCall('/wallet/balance')
  }
}

export const transactionAPI = {
  getMyTransactions: () => {
    return apiCall('/wallet/transactions')
  },
  createRechargeRequest: data => {
    return apiCall('/wallet/recharge', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  getPendingTransactions: () => {
    return apiCall('/admin/transactions/pending')
  },
  approveTransaction: id => {
    return apiCall(`/admin/transactions/${id}/approve`, {
      method: 'PUT'
    })
  },
  rejectTransaction: (id, reason) => {
    return apiCall(`/admin/transactions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    })
  }
}

export const zoneAPI = {
  // Get all zones (public)
  getAllZones: () => {
    return apiCall('/zones')
  },

  // Get zone by ID
  getZoneById: id => {
    return apiCall(`/zones/${id}`)
  },

  // Create new zone (user)
  createZone: zoneData => {
    return apiCall('/zones', {
      method: 'POST',
      body: JSON.stringify(zoneData)
    })
  },

  // Admin: Get all zones
  adminGetAllZones: () => {
    return apiCall('/admin/zones')
  },

  // Admin: Update zone
  adminUpdateZone: (id, zoneData) => {
    return apiCall(`/admin/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData)
    })
  },

  // Admin: Delete zone
  adminDeleteZone: id => {
    return apiCall(`/admin/zones/${id}`, {
      method: 'DELETE'
    })
  },

  // Admin: Toggle zone status
  adminToggleZoneStatus: id => {
    return apiCall(`/admin/zones/${id}/toggle`, {
      method: 'PUT'
    })
  }
}

export default {
  menu: menuAPI,
  packages: packageAPI,
  auth: authAPI,
  orders: orderAPI,
  subscriptions: subscriptionAPI
}
