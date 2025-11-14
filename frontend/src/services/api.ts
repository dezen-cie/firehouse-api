import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  withCredentials: true,
})

// Ajoute le Bearer si on a un token stocké
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
  (err) => {
    const cfg = err.config

    if (!cfg || !err.response) {
      return Promise.reject(err)
    }

    const url: string = cfg.url || ''

    // on ne fait rien de spécial pour login
    if (url.includes('/auth/login')) {
      return Promise.reject(err)
    }

    // si l’API répond 401 → session morte
    if (err.response.status === 401) {
      localStorage.removeItem('accessToken')
      // on peut aussi vider d'autres états si tu veux plus tard
      window.location.href = '/'
    }

    return Promise.reject(err)
  }
)
