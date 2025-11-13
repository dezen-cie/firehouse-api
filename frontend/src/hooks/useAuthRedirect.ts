import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../store/useUser'

export function useAuthRedirect(){
  const { user } = useUser()
  const nav = useNavigate()
  useEffect(()=>{
    if(!user) return
    if(user.role==='admin' || user.role==='super_admin') nav('/admin')
    else nav('/dashboard')
  },[user])
}
