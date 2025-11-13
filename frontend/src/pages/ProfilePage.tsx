import Header from '../components/Header'
import './ProfilePage.scss'
import { useUser } from '../store/useUser'
import { api } from '../services/api'
import { useState } from 'react'
import { useFlash } from '../store/useFlash'

export default function ProfilePage(){
  const { user, setUser } = useUser()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [grade, setGrade] = useState(user?.grade || '')
  const [visible, setVisible] = useState(!!user?.visibleInList)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const isAdmin = user?.role==='admin' || user?.role==='super_admin'
  const show = useFlash(s=>s.show)

  async function save(){
    if(password && password!==confirm){ show('Les mots de passes ne correspondent pas ', 'error'); return }
    const r = await api.patch('/me', { firstName, lastName, grade, visibleInList: isAdmin ? visible : undefined, password: password || undefined })
    setUser({ ...(user as any), ...r.data })
    show('Profil mis à jour', 'success')
  }

  function pickAvatar(){
    const input = document.createElement('input')
    input.type='file'; input.accept='image/*'
    input.onchange = async ()=>{
      if(!input.files?.[0]) return
      const fd = new FormData(); fd.append('avatar', input.files[0])
      const r = await api.put('/me/avatar', fd)
      setUser({ ...(user as any), avatarUrl: r.data.avatarUrl })
    }
    input.click()
  }

  return (
    <div className="profile-page">
      <Header/>
      <div className="content">
        <div className="portrait" onClick={pickAvatar}>
          <img src={user?.avatarUrl || '/illu-pompier.png'} />
          <span>Changer la photo</span>
        </div>
        <div className="row">
          <label>Nom</label>
          <input value={lastName} onChange={e=>setLastName(e.target.value)} />
        </div>
        <div className="row">
          <label>Prénom</label>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)} />
        </div>
        <div className="row">
          <label>Email</label>
          <input value={(user as any)?.email || ''} disabled />
        </div>
        <div className="row">
          <label>Grade</label>
          <input value={grade} onChange={e=>setGrade(e.target.value)} />
        </div>
        {isAdmin && <label className="chk"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)} /> Visible dans la liste</label>}
        <div className="row">
          <label>Nouveau mot de passe</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="laisser vide pour ne pas changer"/>
        </div>
        <div className="row">
          <label>Confirmation</label>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} />
        </div>
        <button onClick={save}>Enregistrer</button>
      </div>
    </div>
  )
}
