import './AdminTabs.scss'
import { NavLink } from 'react-router-dom'

export default function AdminTabs(){
  return (
    <div className="tabs">
      <NavLink to="/admin" end>Vue équipe</NavLink>
      <NavLink to="/admin/users">Utilisateurs</NavLink>
      <NavLink to="/admin/reports">Rapports</NavLink>
    </div>
  )
}
