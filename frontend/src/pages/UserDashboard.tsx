import Header from '../components/Header'
import StatusButton from '../components/StatusButton'
import './UserDashboard.scss'
import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { useUser } from '../store/useUser'

type Status = 'AVAILABLE'|'INTERVENTION'|'UNAVAILABLE'|'ABSENT'

export default function UserDashboard(){
  const { user } = useUser()
  const [currentStatus, setCurrentStatus] = useState<Status | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [comment, setComment] = useState('')
  const [returnAt, setReturnAt] = useState<string>('')          
  const [file, setFile] = useState<File|null>(null)
  const [flash, setFlash] = useState<string|null>(null)
  const flashTimer = useRef<number|null>(null)

  const effectiveStatus: Status | null = selectedStatus ?? currentStatus

  const isReturnEnabled = effectiveStatus === 'UNAVAILABLE' || effectiveStatus === 'ABSENT'
  const hasStatusChange = selectedStatus !== null
  const hasComment = comment.trim().length > 0
  const hasReturn = isReturnEnabled && !!returnAt
  const hasFile = !!file

  const canSubmit = hasStatusChange || hasComment || hasReturn || hasFile

  useEffect(()=>{
    let mounted = true

    async function loadCurrent(){
      try{
        const r = await api.get('/status/current')
        const s = r.data?.status as Status | null
        if(!mounted) return
        if(s){
          setCurrentStatus(s)
        }
      }catch(e){
      }
    }

    loadCurrent()

    return ()=>{
      mounted = false
      if(flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  },[])

  function pickAvatar(){
    const input = document.createElement('input')
    input.type='file'
    input.accept='image/*'
    input.onchange = async ()=>{
      if(!input.files?.[0]) return
      const fd = new FormData()
      fd.append('avatar', input.files[0])
      const r = await api.put('/me/avatar', fd)
      const img = document.querySelector('.portrait') as HTMLImageElement | null
      if(img) img.src = r.data.avatarUrl
    }
    input.click()
  }

  async function submit(){
    const fd = new FormData()
    let has = false

    if(hasStatusChange && selectedStatus){
      fd.append('status', selectedStatus as Status)
      has = true
    }
    if(hasComment){
      fd.append('comment', comment)
      has = true
    }
    if(hasReturn){
      fd.append('returnAt', new Date(returnAt).toISOString())
      has = true
    }
    if(hasFile && file){
      fd.append('file', file)
      has = true
    }

    if (!has) return

    await api.post('/status', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

    if(selectedStatus){
      setCurrentStatus(selectedStatus)
    }

    setSelectedStatus(null)
    setComment('')
    setReturnAt('')
    setFile(null)

    setFlash('Statut mis à jour')
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(()=> setFlash(null), 3000)
  }

  function choose(status: Status){
    setSelectedStatus(status)
    if(status === 'AVAILABLE' || status === 'INTERVENTION'){
      setReturnAt('')
    }
  }

  return (
    <div className="user-dash">
      <Header/>
      <div className="content">

        {flash && <div className="flash flash--success">{flash}</div>}

        <div className="profile">
          <img
            src={user?.avatarUrl || '/illu-pompier.png'}
            className="portrait"
            onClick={pickAvatar}
            onError={(e)=>{ (e.currentTarget as HTMLImageElement).src='/illu-pompier.png' }}
          />
          <div className="name">{user?.firstName} {user?.lastName}</div>
          <div className="grade">{user?.grade || '—'}</div>
        </div>

        <div className="grid">
          <StatusButton
            label="Disponible"
            color="#39AE93"
            active={effectiveStatus === 'AVAILABLE'}
            onClick={()=>choose('AVAILABLE')}
          />
          <StatusButton
            label="Intervention"
            color="#F16D3F"
            active={effectiveStatus === 'INTERVENTION'}
            onClick={()=>choose('INTERVENTION')}
          />
          <StatusButton
            label="Indisponible"
            color="#FEC33D"
            active={effectiveStatus === 'UNAVAILABLE'}
            onClick={()=>choose('UNAVAILABLE')}
          />
          <StatusButton
            label="Absent"
            color="#A4A4A4"
            active={effectiveStatus === 'ABSENT'}
            onClick={()=>choose('ABSENT')}
          />
        </div>

        <label>Commentaire</label>
        <input
          placeholder="Message pour l’admin"
          value={comment}
          onChange={e=>setComment(e.target.value)}
        />

        <label>Retour prévu</label>
        <input
          type="datetime-local"
          value={returnAt}
          onChange={e=>setReturnAt(e.target.value)}
          disabled={!isReturnEnabled}
        />

        <label>Envoyer un fichier</label>
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />

        <button className="cta" onClick={submit} disabled={!canSubmit}>
          Mettre à jour mon statut
        </button>
      </div>
    </div>
  )
}
