import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import UserDashboard from './pages/UserDashboard'
import AdminDashboard from './pages/AdminDashboard'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import MessagesPage from './pages/MessagesPage'
import FilesInbox from './pages/FilesInbox'
import ProfilePage from './pages/ProfilePage'
import { useUser } from './store/useUser'
import { JSX, useEffect, useState } from 'react'
import { api } from './services/api'

function AuthBootstrap({ children }:{ children: JSX.Element }){
  const { user, setUser } = useUser()
  const [ready, setReady] = useState<boolean>(!!user)
  useEffect(()=>{
    let abort = false
    ;(async ()=>{
      try{
        const me = await api.get('/me')
        if(!abort){ setUser(me.data); setReady(true) }
      }catch{
        try{
          await api.post('/auth/refresh')
          const me = await api.get('/me')
          if(!abort){ setUser(me.data); setReady(true) }
        }catch{
          if(!abort){ setReady(true) }
        }
      }
    })()
    return ()=>{ abort = true }
  },[])
  if(!ready) return null
  return children
}

function RequireAuth({ children }:{ children: JSX.Element }){
  const { user } = useUser()
  if(!user) return <Navigate to="/" replace />
  return children
}
function RequireAdmin({ children }:{ children: JSX.Element }){
  const { user } = useUser()
  if(!user || (user.role!=='admin' && user.role!=='super_admin')) return <Navigate to="/dashboard" replace />
  return children
}

export default function App(){
  return (
    <AuthBootstrap>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/dashboard" element={<RequireAuth><UserDashboard/></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage/></RequireAuth>} />
        <Route path="/messages" element={<RequireAuth><MessagesPage/></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard/></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><UsersPage/></RequireAdmin>} />
        <Route path="/admin/reports" element={<RequireAdmin><ReportsPage/></RequireAdmin>} />
        <Route path="/admin/files" element={<RequireAdmin><FilesInbox/></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthBootstrap>
  )
}
