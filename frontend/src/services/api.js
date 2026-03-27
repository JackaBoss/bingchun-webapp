import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const client = axios.create({ baseURL: BASE_URL })

// Attach access token to every request
client.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401 TOKEN_EXPIRED
let isRefreshing = false
let waitingQueue = []

client.interceptors.response.use(
  res => res.data,
  async err => {
    const original = err.config
    if (
      err.response?.status === 401 &&
      err.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitingQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return client(original)
        })
      }

      isRefreshing = true
      const refreshToken = localStorage.getItem('refreshToken')

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        waitingQueue.forEach(p => p.resolve(data.accessToken))
        waitingQueue = []

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return client(original)
      } catch {
        waitingQueue.forEach(p => p.reject())
        waitingQueue = []
        localStorage.clear()
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err.response?.data || err)
  }
)

// Convenience wrappers
const api = {
  get:    (url, params) => client.get(url, { params }),
  post:   (url, data)   => client.post(url, data),
  put:    (url, data)   => client.put(url, data),
  delete: (url)         => client.delete(url),
}

export default api
