import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://bingchun.up.railway.app/api'

const client = axios.create({ baseURL: BASE_URL })

// Attach token to every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle auth errors
client.interceptors.response.use(
  res => res.data,
  async err => {
    const status = err.response?.status
    const code = err.response?.data?.code

    // Token expired — try refresh
    if (status === 401 && code === 'TOKEN_EXPIRED') {
      // Admin app doesn't store refresh token — just log out
      localStorage.removeItem('admin_user')
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // 401 generic — not logged in
    if (status === 401) {
      localStorage.removeItem('admin_user')
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
      return Promise.reject(err)
    }

    // 403 — logged in but insufficient role
    if (status === 403) {
      // Redirect to the page they do have access to, with a toast flag
      sessionStorage.setItem('forbidden_toast', '1')
      window.location.href = '/orders'
      return Promise.reject(err)
    }

    return Promise.reject(err)
  }
)

const api = {
  get:    (url, params) => client.get(url, { params }),
  post:   (url, data)   => client.post(url, data),
  patch:  (url, data)   => client.patch(url, data),
  delete: (url)         => client.delete(url),
}

export default api