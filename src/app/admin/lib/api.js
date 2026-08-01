// The API now lives in this same Next.js app under src/app/api, so calls are
// same-origin and relative — no base URL, no CORS.
//
// Dead methods kept for reference: transactionAPI.getAllTransactions /
// getTransactionById / getTransactionStats and authAPI.getAdminProfile have no
// matching route (they had none in the Express backend either) and no page calls
// them. Delete them or add the routes before wiring anything up to them.
const API_BASE_URL = '/api'

// Get token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('adminToken')
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
      // Handle token expiration
      if (response.status === 401) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login'
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

// Auth APIs
export const authAPI = {
  // Admin login
  adminLogin: (email, password) => {
    return apiCall('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Get admin profile
  getAdminProfile: () => {
    return apiCall('/auth/profile');
  },

  // Logout - clear token on server side (optional)
  logout: async () => {
    try {
      // Optional: Call server to blacklist token
      await apiCall('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }
  },

  // Change password
  changePassword: (passwordData) => {
    return apiCall('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },
};

// Dashboard APIs
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: () => {
    return apiCall('/admin/stats')
  },

  // Get recent activities
  getRecentActivities: () => {
    return apiCall('/admin/activities')
  }
}

// Package APIs
export const packageAPI = {
  // Get all packages
  getAllPackages: () => {
    return apiCall('/packages')
  },

  // Get single package
  getPackageById: id => {
    return apiCall(`/packages/${id}`)
  },

  // Create package (Admin)
  createPackage: packageData => {
    return apiCall('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData)
    })
  },

  // Update package (Admin)
  updatePackage: (id, packageData) => {
    return apiCall(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packageData)
    })
  },

  // Delete package (Admin)
  deletePackage: id => {
    return apiCall(`/packages/${id}`, {
      method: 'DELETE'
    })
  }
}

// Menu APIs
// Menu APIs
export const menuAPI = {
  // Get menu by package
  getMenuByPackage: packageType => {
    return apiCall(`/menu/package/${packageType}`)
  },

  // Get all menu (Admin)
  getAllMenu: () => {
    return apiCall('/menu')
  },

  // Create menu item (Admin)
  createMenuItem: menuData => {
    return apiCall('/menu', {
      method: 'POST',
      body: JSON.stringify(menuData)
    })
  },

  // Update menu item (Admin)
  updateMenuItem: (id, menuData) => {
    return apiCall(`/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(menuData)
    })
  },

  // Delete menu item (Admin)
  deleteMenuItem: id => {
    return apiCall(`/menu/${id}`, {
      method: 'DELETE'
    })
  },

  // Bulk update menu
  bulkUpdateMenu: items => {
    return apiCall('/menu/bulk', {
      method: 'PUT',
      body: JSON.stringify({ items })
    })
  }
}

export const expenseAPI = {
  getAllExpenses: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/admin/expenses${queryParams ? `?${queryParams}` : ''}`);
  },
  createExpense: (data) => {
    return apiCall('/admin/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteExpense: (id) => {
    return apiCall(`/admin/expenses/${id}`, {
      method: 'DELETE',
    });
  },
  getStats: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/admin/expenses/stats${queryParams ? `?${queryParams}` : ''}`);
  },
};

// Manual Order APIs
export const manualOrderAPI = {
  getAllOrders: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/admin/manual-orders${queryParams ? `?${queryParams}` : ''}`);
  },
  createOrder: (data) => {
    return apiCall('/admin/manual-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateOrderStatus: (id, status) => {
    return apiCall(`/admin/manual-orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  deleteOrder: (id) => {
    return apiCall(`/admin/manual-orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Profit Stats API
export const profitAPI = {
  getStats: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/admin/profit-stats${queryParams ? `?${queryParams}` : ''}`);
  },
};

export const transactionAPI = {
  // Get all pending transactions (Admin)
  getPendingTransactions: () => {
    return apiCall('/admin/transactions/pending');
  },

  // Get all transactions (Admin) - with optional filters
  getAllTransactions: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/admin/transactions${queryParams ? `?${queryParams}` : ''}`);
  },

  // Approve transaction (Admin)
  approveTransaction: (id) => {
    return apiCall(`/admin/transactions/${id}/approve`, {
      method: 'PUT',
    });
  },

  // Reject transaction (Admin)
  rejectTransaction: (id, reason) => {
    return apiCall(`/admin/transactions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  // Get transaction by ID (Admin)
  getTransactionById: (id) => {
    return apiCall(`/admin/transactions/${id}`);
  },

  // Get transaction stats (Admin)
  getTransactionStats: () => {
    return apiCall('/admin/transactions/stats');
  },
};

export const walletAPI = {
  // Get wallet balance (User)
  getBalance: () => {
    return apiCall('/wallet/balance');
  },

  // Create recharge request (User)
  createRechargeRequest: (data) => {
    return apiCall('/wallet/recharge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get user transactions (User)
  getUserTransactions: () => {
    return apiCall('/wallet/transactions');
  },
};

// Order APIs
export const orderAPI = {
  // Get all orders (Admin)
  // getAllOrders: (filters = {}) => {
  //   const queryParams = new URLSearchParams(filters).toString()
  //   return apiCall(`/orders${queryParams ? `?${queryParams}` : ''}`)
  // },

  getAllOrders: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/orders${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get order by ID
  getOrderById: id => {
    return apiCall(`/orders/${id}`)
  },

  // Update order status (Admin)
  updateOrderStatus: (id, status) => {
    return apiCall(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  },

  // Cancel order (Admin)
  cancelOrder: (id, reason) => {
    return apiCall(`/orders/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  },

  checkDateBlocked: (date) => {
    return apiCall('/blocked-dates/check', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  },

  // Get order stats (Admin)
  getOrderStats: () => {
    return apiCall('/orders/stats')
  }
}

export const blockedDateAPI = {
  getAllBlockedDates: () => {
    return apiCall('/admin/blocked-dates');
  },
  addBlockedDate: (date, reason) => {
    return apiCall('/admin/blocked-dates', {
      method: 'POST',
      body: JSON.stringify({ date, reason }),
    });
  },
  removeBlockedDate: (id) => {
    return apiCall(`/admin/blocked-dates/${id}`, {
      method: 'DELETE',
    });
  },
};

// Subscription APIs
export const subscriptionAPI = {
  // Get all subscriptions (Admin)
  getAllSubscriptions: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString()
    return apiCall(`/subscriptions${queryParams ? `?${queryParams}` : ''}`)
  },

  // Get pending subscriptions (Admin)
  getPendingSubscriptions: () => {
    return apiCall('/subscriptions/pending')
  },

  // Approve subscription (Admin)
  approveSubscription: id => {
    return apiCall(`/subscriptions/${id}/approve`, {
      method: 'PUT'
    })
  },

  // Reject subscription (Admin)
  rejectSubscription: (id, reason) => {
    return apiCall(`/subscriptions/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    })
  },

  // Get subscription stats (Admin)
  getSubscriptionStats: () => {
    return apiCall('/subscriptions/stats')
  }
}

// User Management APIs (Admin)
export const userAPI = {
  // Get all users
  getAllUsers: (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString()
    return apiCall(`/admin/users${queryParams ? `?${queryParams}` : ''}`)
  },

  // Get user by ID
  getUserById: id => {
    return apiCall(`/admin/users/${id}`)
  },

  // Update user (Admin)
  updateUser: (id, userData) => {
    return apiCall(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  },

  // Delete user (Admin)
  deleteUser: id => {
    return apiCall(`/admin/users/${id}`, {
      method: 'DELETE'
    })
  },

  // Update user wallet (Admin)
  updateUserWallet: (id, amount, action, reason) => {
    return apiCall(`/admin/users/${id}/wallet`, {
      method: 'PUT',
      body: JSON.stringify({ amount, action, reason })
    })
  }
}

// Settings APIs
export const settingsAPI = {
  // Get system settings
  getSettings: async () => {
    try {
      const response = await apiCall('/admin/settings')
      return response
    } catch (error) {
      console.error('Error fetching settings:', error)
      throw error
    }
  },

  // Update system settings
  updateSettings: async settingsData => {
    try {
      const response = await apiCall('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData)
      })
      return response
    } catch (error) {
      console.error('Error updating settings:', error)
      throw error
    }
  },

  // Backup database
  backupDatabase: async () => {
    try {
      const response = await apiCall('/admin/backup', {
        method: 'POST'
      })
      return response
    } catch (error) {
      console.error('Error backing up database:', error)
      throw error
    }
  }
}

export const zoneAPI = {
  // Get all zones (Admin)
  adminGetAllZones: () => {
    return apiCall('/admin/zones');
  },

  // Create zone (Admin)
  adminCreateZone: (zoneData) => {
    return apiCall('/admin/zones', {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  },

  // Update zone (Admin)
  adminUpdateZone: (id, zoneData) => {
    return apiCall(`/admin/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(zoneData),
    });
  },

  // Delete zone (Admin)
  adminDeleteZone: (id) => {
    return apiCall(`/admin/zones/${id}`, {
      method: 'DELETE',
    });
  },

  // Toggle zone status (Admin)
  adminToggleZoneStatus: (id) => {
    return apiCall(`/admin/zones/${id}/toggle`, {
      method: 'PUT',
    });
  },

  approveZone: (id, deliveryCharge) => {
    return apiCall(`/admin/zones/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ deliveryCharge }),
    });
  },
};

// Also add user zone API (for public access)
export const publicZoneAPI = {
  // Get all active zones
  getAllZones: () => {
    return apiCall('/zones');
  },

  // Get zone by ID
  getZoneById: (id) => {
    return apiCall(`/zones/${id}`);
  },

  // Create zone (user can add)
  createZone: (zoneData) => {
    return apiCall('/zones', {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  },
};

// Export API
export const exportAPI = {
  exportData: (type, startDate, endDate) => {
    const queryParams = new URLSearchParams({ startDate, endDate }).toString()
    return apiCall(
      `/admin/export/${type}${queryParams ? `?${queryParams}` : ''}`
    )
  }
}

// Default export
const API = {
  auth: authAPI,
  dashboard: dashboardAPI,
  packages: packageAPI,
  menu: menuAPI,
  orders: orderAPI,
  subscriptions: subscriptionAPI,
  users: userAPI,
  settings: settingsAPI,
  export: exportAPI,
  wallet: walletAPI,
  transactions: transactionAPI,
  zones: zoneAPI,        // Add this
  publicZones: publicZoneAPI,
}

export default API
