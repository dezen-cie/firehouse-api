import axios from 'axios'
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  withCredentials: true
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

    if (err.response.status === 401) {
      try{
        await api.post('/auth/refresh')
        return api.request(cfg)
      }catch(e){
        
      }
    }
    return Promise.reject(err)
  }
)

