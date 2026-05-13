import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://bingchun.up.railway.app/api'

const client = axios.create({ baseURL: BASE_URL })

// Attach token
client.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

client.interceptors.response.use(
  res => res.data,
  async err => {
    const status = err.response?.status
    const code = err.response?.data?.code
    const originalRequest = err.config

    // Token expired — attempt refresh
    if (status === 401 && code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        client.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return client(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    // 401 generic
    if (status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // 403 — account deactivated or access denied
    if (status === 403) {
      const msg = err.response?.data?.error || 'Access denied'
      // If requiresOtp — let the caller handle it
      if (err.response?.data?.requiresOtp) return Promise.reject(err.response.data)
      // Otherwise surface cleanly
      return Promise.reject({ error: msg, status: 403 })
    }

    return Promise.reject(err.response?.data || err)
  }
)

const api = {
  get:    (url, params) => client.get(url, { params }),
  post:   (url, data)   => client.post(url, data),
  patch:  (url, data)   => client.patch(url, data),
  delete: (url)         => client.delete(url),
}

export default api