import './Login.scss'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useUser } from '../store/useUser'
import { connectSocket } from '../services/socket'
import { useBadges } from '../store/useBadges'

export default function Login(){
  const nav = useNavigate()
  const { setUser } = useUser()
  const { setMessages, setFiles } = useBadges()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string|null>(null)

  async function submit(e:React.FormEvent){
    e.preventDefault()
    setErr(null)
    try{
      const res = await api.post('/auth/login', { email, password })

      // ⭐ on garde le token en local pour Authorization
      if (res.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.accessToken)
      }

      setUser(res.data.user)

      const s = connectSocket()
      s?.on('badge:update', async ()=>{
        const r = await api.get('/conversations/unread/count')
        setMessages(r.data.count)
      })
      try{
        const r = await api.get('/conversations/unread/count')
        setMessages(r.data.count)
      }catch{}
      setFiles(0)

      if(res.data.user.role==='admin' || res.data.user.role==='super_admin') nav('/admin')
      else nav('/dashboard')
    } catch(e:any){
      console.error('LOGIN ERROR', e)

      if (!e.response) {
        setErr('Serveur indisponible ou réponse invalide. Vérifie l’API puis réessaie.')
      } else {
        setErr(e.response.data?.error || 'Connexion impossible')
      }
    }
  }

  return (
    <div className="login-page">
      <form onSubmit={submit} className="card">
        <img src="/fire.png" alt="logo" className="logo"/>
        <h1>Connexion</h1>
        {err && <div className="error">{err}</div>}
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="Mot de passe" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button>Se connecter</button>
      </form>
    </div>
  )
}
