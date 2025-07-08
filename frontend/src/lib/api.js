/**
 * API client for DoIt backend
 */
import axios from 'axios'

// Use current window location for better cross-platform compatibility
const API_BASE_URL = typeof window !== 'undefined' && window.location.origin 
  ? window.location.origin.replace(/:\d+$/, ':5000')
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  getCurrentUser: () => api.get('/api/auth/me'),
  verifyToken: () => api.post('/api/auth/verify'),
  logout: () => api.post('/api/auth/logout'),
}

// Users API
export const usersAPI = {
  getCurrentProfile: () => api.get('/api/users/me'),
  updateProfile: (userData) => api.put('/api/users/me', userData),
  getUserById: (id) => api.get(`/api/users/${id}`),
  getUserByUid: (uid) => api.get(`/api/users/uid/${uid}`),
  getUserByUsername: (username) => api.get(`/api/users/username/${username}`),
  searchUsers: (params) => api.get('/api/users/', { params }),
  deleteAccount: () => api.delete('/api/users/me'),
}

// Tasks API
export const tasksAPI = {
  createTask: (taskData) => api.post('/api/tasks/', taskData),
  getTasks: (params) => api.get('/api/tasks/', { params }),
  getTaskById: (id) => api.get(`/api/tasks/${id}`),
  updateTask: (id, taskData) => api.put(`/api/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
  completeTask: (id) => api.post(`/api/tasks/${id}/complete`),
  cancelTask: (id) => api.post(`/api/tasks/${id}/cancel`),
  getCategories: () => api.get('/api/tasks/categories/'),
}

// Applications API
export const applicationsAPI = {
  createApplication: (applicationData) => api.post('/api/applications/', applicationData),
  getApplications: (params) => api.get('/api/applications/', { params }),
  getApplicationById: (id) => api.get(`/api/applications/${id}`),
  updateApplicationStatus: (id, status) => api.put(`/api/applications/${id}`, { status }),
  withdrawApplication: (id) => api.delete(`/api/applications/${id}`),
  getTaskApplications: (taskId) => api.get(`/api/applications/task/${taskId}`),
}

// Chat API
export const chatAPI = {
  createOrGetChat: (taskId) => api.post('/api/chat/', null, { params: { task_id: taskId } }),
  getUserChats: () => api.get('/api/chat/'),
  getChatById: (id) => api.get(`/api/chat/${id}`),
  sendMessage: (messageData) => api.post('/api/chat/messages', messageData),
  getChatMessages: (chatId, params) => api.get(`/api/chat/${chatId}/messages`, { params }),
  markMessageAsRead: (messageId) => api.put(`/api/chat/messages/${messageId}/read`),
  shareLocation: (chatId) => api.post(`/api/chat/${chatId}/location-share`),
}

// Reviews API
export const reviewsAPI = {
  createReview: (reviewData) => api.post('/api/reviews/', reviewData),
  getReviews: (params) => api.get('/api/reviews/', { params }),
  getReviewById: (id) => api.get(`/api/reviews/${id}`),
  deleteReview: (id) => api.delete(`/api/reviews/${id}`),
  getUserReviewStats: (userUid) => api.get(`/api/reviews/user/${userUid}/stats`),
}

// Notifications API
export const notificationsAPI = {
  getNotifications: (params) => api.get('/api/notifications/', { params }),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/api/notifications/${id}`),
}

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export const getAuthToken = () => {
  return localStorage.getItem('auth_token')
}

export default api