import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  withCredentials: true
})


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers = config.headers || {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})


api.interceptors.response.use(
  r => r,
  async err => {
    const cfg = err.config

    if (!cfg || !err.response) {
      return Promise.reject(err)
    }

    const url: string = cfg.url || ''

    if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
      return Promise.reject(err)
    }

    if (err.response.status === 401 && !cfg._retry) {
      cfg._retry = true
      try{
        const r = await api.post('/auth/refresh')
        if (r.data?.accessToken) {
          localStorage.setItem('accessToken', r.data.accessToken)
        }
        return api.request(cfg)
      }catch(e){
        localStorage.removeItem('accessToken')
      }
    }
    return Promise.reject(err)
  }
)
