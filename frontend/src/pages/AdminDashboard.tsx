import Header from '../components/Header'
import AdminTabs from '../components/AdminTabs'
import './AdminDashboard.scss'
import { useEffect, useState } from 'react'
import { api } from '../services/api'

type Item = { id:number, firstName:string, lastName:string, grade?:string, avatarUrl?:string, status:'AVAILABLE'|'INTERVENTION'|'UNAVAILABLE'|'ABSENT' }

export default function AdminDashboard(){
  const [items, setItems] = useState<Item[]>([])
  useEffect(()=>{
    api.get('/admin/team').then(r=>setItems(r.data))
  },[])
  return (
    <div className="admin-dash">
      <Header/>
      <AdminTabs/>
      <div className="content">
        <section className="grid">
          {items.map((u)=>(
            <div className="card" key={u.id}>
              <img src={u.avatarUrl || '/illu-pompier.png'}/>
              <div className="info">
                <div className="name">{u.firstName} {u.lastName}</div>
                <div className={"badge "+u.status.toLowerCase()}>
                  {u.status==='AVAILABLE'?'Disponible':u.status==='INTERVENTION'?'Intervention':u.status==='UNAVAILABLE'?'Indisponible':'Absent'}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
