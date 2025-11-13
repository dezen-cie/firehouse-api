import Header from '../components/Header'
import AdminTabs from '../components/AdminTabs'
import './FilesInbox.scss'
import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { useBadges } from '../store/useBadges'   

type FileRow = {
  id: number
  originalName: string
  mime: string
  size: number
  createdAt: string
  user?: { id:number, firstName?:string, lastName?:string }
  url?: string | null
}

export default function FilesInbox(){
  const [files, setFiles] = useState<FileRow[]>([])
  const { setFiles: setFileBadge } = useBadges()   
  async function load(){
    const r = await api.get('/files/inbox')
    setFiles(r.data)
  }
  useEffect(()=>{ load() },[])

  function exportZip(){
    const base = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api')
    window.location.href = `${base}/files/export`
  }

  // utilitaire: quand l'admin agit sur un fichier, on enlève 1 notif localement
  function clearFileBadgeOnce(){
    setFileBadge((p:number)=> Math.max(0, p-1))
  }

  function view(id:number){
    const base = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api')
    // nouvelle route inline
    window.open(`${base}/files/${id}/view`, '_blank', 'noopener')
    clearFileBadgeOnce()
  }

  function dl(id:number){
    const base = (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api')
    window.location.href = `${base}/files/${id}/download`
    clearFileBadgeOnce()
  }

  async function del(id:number){
    if(!confirm('Supprimer ce fichier ?')) return
    await api.delete(`/files/${id}`)
    clearFileBadgeOnce()
    load()
  }

  return (
    <div className="files-page">
      <Header/>
      <AdminTabs/>
      <div className="content">
        <div className="toolbar">
          <button onClick={exportZip}>Exporter tout (ZIP)</button>
        </div>
        <div className="list">
          {files.map(f=>(
            <div className="row" key={f.id}>
              <div className="sender-meta-row">
                {(f.user?.firstName || '')} {(f.user?.lastName || '')} — {new Date(f.createdAt).toLocaleString()}
              </div>

              <div className="name">{f.originalName}</div>
              <div className="meta">{(f.size/1024).toFixed(1)} Ko</div>
              <div className="actions">
                <button onClick={()=>view(f.id)}>Visualiser</button>
                <button onClick={()=>dl(f.id)}>Télécharger</button>
                <button onClick={()=>del(f.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
