import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  withCredentials: true,
})

// ajoute le Bearer si on a un token stocké
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers = config.headers || {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const cfg = err.config

    if (!cfg || !err.response) {
      return Promise.reject(err)
    }

    const url: string = cfg.url || ''

    // on ne tente pas de refresh sur login / refresh eux-mêmes
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(err)
    }

    if (err.response.status === 401 && !cfg._retry) {
      cfg._retry = true
      try {
        const r = await api.post('/auth/refresh')
        if (r.data?.accessToken) {
          localStorage.setItem('accessToken', r.data.accessToken)
        } else {
          // pas de token dans la réponse => session morte
          localStorage.removeItem('accessToken')
          window.location.href = '/'
          return Promise.reject(err)
        }
        return api.request(cfg)
      } catch (e) {
        localStorage.removeItem('accessToken')
        window.location.href = '/'
        return Promise.reject(e)
      }
    }

    return Promise.reject(err)
  }
)
