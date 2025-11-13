import React, { useState, ChangeEvent } from 'react'
import './UserModal.scss'
import { api } from '../services/api'
import Toggle from '../components/Toggle';
import { useFlash } from '../store/useFlash'

type Role = 'user' | 'admin' | 'super_admin'

export interface IUser {
  id?: number
  firstName: string
  lastName: string
  email: string
  grade?: string | null
  role: Role
}

interface Props {
  onClose: () => void
  user?: IUser | null
  onSaved: () => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  grade: string
  role: Role
  password: string
  confirm: string
}

export default function UserModal({ onClose, user, onSaved }: Props){
  const show = useFlash(s=>s.show)
  const isEdit = !!user
  const [form, setForm] = useState<FormState>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    grade: user?.grade || '',
    role: (user?.role as Role) || 'user',
    password: '',
    confirm: ''
  })

  function handleChange(e: ChangeEvent<HTMLInputElement>){
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function submit(){
    if(form.password && form.password !== form.confirm){
      show('Les mots de passe ne correspondent pas', 'error')
      return
    }
    try{
      if(isEdit && user?.id){
        await api.put('/users/'+user.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          grade: form.grade,
          role: form.role,
          ...(form.password ? { password: form.password } : {})
        })
         show('Profil utilisateur mis à jour', 'success')
      }else{
        await api.post('/users', {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          grade: form.grade,
          role: form.role,
          password: form.password
        })
         show('Utilisateur créé avec succès', 'success')
      }
      onSaved()
      onClose()
    }catch(e:any){
      show(e?.response?.data?.error || 'Erreur lors de la sauvegarde', 'error')
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={e=>e.stopPropagation()}>
        <h3>{isEdit ? 'Modifier l’utilisateur' : 'Créer un utilisateur'}</h3>
        <input name="firstName" className="modal-input" type="text" placeholder="Prénom" value={form.firstName} onChange={handleChange} />
        <input name="lastName" className="modal-input" type="text" placeholder="Nom" value={form.lastName} onChange={handleChange} />
        <input name="email" className="modal-input" type="email" placeholder="Email" value={form.email} onChange={handleChange} disabled={isEdit} />
        <input name="grade" className="modal-input" type="text" placeholder="Grade" value={form.grade} onChange={handleChange} />

        <div className="toggle-row toggle-switch">
          <Toggle
            checked={form.role === 'admin'}
            onChange={(val)=> setForm(prev=>({ ...prev, role: val ? 'admin' : 'user' }))}
            labelOn="Admin"
            labelOff="Utilisateur"
            ariaLabel="Basculer le rôle"
          />
        </div>


        <input name="password" className="modal-input" type="password" placeholder={isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'} value={form.password} onChange={handleChange} />
        <input name="confirm" className="modal-input" type="password" placeholder={isEdit ? 'Confirmation (si mot de passe saisi)' : 'Confirmation du mot de passe'} value={form.confirm} onChange={handleChange} />

        <div className="buttons">
          <button className="primary" onClick={submit}>{isEdit ? 'Mettre à jour' : 'Créer'}</button>
          <button className="secondary" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
