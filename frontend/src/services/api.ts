import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:4000/api',
  withCredentials: true,
})

// Ajout du Bearer pour toutes les requêtes si on a un token
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

    // Pas de config ou pas de réponse -> on laisse filer l'erreur brute
    if (!cfg || !err.response) {
      return Promise.reject(err)
    }

    const status = err.response.status
    const url: string = cfg.url || ''

    // On ne touche jamais aux erreurs du login lui-même
    if (url.includes('/auth/login')) {
      return Promise.reject(err)
    }

    if (status === 401) {
      // Session morte -> on nettoie
      localStorage.removeItem('accessToken')

      // Surtout ne PAS recharger si on est déjà sur la page de login,
      // sinon on crée une boucle de refresh.
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }

    return Promise.reject(err)
  }
)
