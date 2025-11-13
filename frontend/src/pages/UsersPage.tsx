import Header from '../components/Header'
import AdminTabs from '../components/AdminTabs'
import './UsersPage.scss'
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import UserModal from '../modals/UserModal'

type Role = 'user' | 'admin' | 'super_admin'

interface IListUser {
  id: number
  firstName: string
  lastName: string
  email: string
  grade?: string | null
  role: Role
  avatarUrl?: string | null
}

export default function UsersPage(){
  const [list, setList] = useState<IListUser[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IListUser | null>(null)

  async function load(){
    const r = await api.get('/users')
    setList(r.data)
  }
  useEffect(()=>{ load() },[])

  function onCreate(){
    setEditing(null)
    setOpen(true)
  }
  function onEdit(u:IListUser){
    setEditing(u)
    setOpen(true)
  }

  async function removeUser(id:number){
    if(!confirm('Supprimer cet utilisateur ?')) return
    await api.delete(`/users/${id}`)
    await load()
  }

  return (
    <div className="users-page">
      <Header/>
      <AdminTabs/>
      <div className="content">
        <div className="list">
          {list.map(u=>(
            <div className="row" key={u.id}>
              <img src={u.avatarUrl || '/illu-pompier.png'} onError={(e)=>{ (e.currentTarget as HTMLImageElement).src='/illu-pompier.png' }} />
              <div className="meta">
                <div className="name">{u.firstName} {u.lastName}</div>
                <div className="grade">{u.grade || '—'}</div>
              </div>
              <div className="actions">
                <button onClick={()=>onEdit(u)}>✏️</button>
                <button onClick={()=>removeUser(u.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
        <button className="create" onClick={onCreate}>Créer un utilisateur</button>
      </div>

      {open && (
        <UserModal
          user={editing}
          onClose={()=>setOpen(false)}
          onSaved={async ()=>{ setOpen(false); await load() }}
        />
      )}
    </div>
  )
}
