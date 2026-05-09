import { useAuthStore } from '@/stores/auth'

const BASE = import.meta.env.VITE_API_URL || 'https://bingchun.up.railway.app/api'

async function request(method, path, data = null) {
  const auth = useAuthStore()
  const headers = { 'Content-Type': 'application/json' }
  if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  })

  const json = await res.json()

  if (res.status === 401) {
    auth.logout()
    window.location.href = '/login'
    return Promise.reject({ status: 401, data: json })
  }

  if (res.status === 403) {
    sessionStorage.setItem('forbidden_toast', '1')
    window.location.href = '/orders'
    return Promise.reject({ status: 403, data: json })
  }

  if (!res.ok) throw { response: { data: json }, status: res.status }
  return json
}

export default {
  get:    (path, params) => {
    const url = params ? `${path}?${new URLSearchParams(params)}` : path
    return request('GET', url)
  },
  post:   (path, data)   => request('POST',   path, data),
  patch:  (path, data)   => request('PATCH',  path, data),
  put:    (path, data)   => request('PUT',    path, data),
  delete: (path)         => request('DELETE', path),
}