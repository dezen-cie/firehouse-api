import './Flash.scss'
import { useFlash } from '../store/useFlash'
import { X } from 'lucide-react'

export default function Flash(){
  const { message, variant, hide } = useFlash()
  if(!message) return null
  return (
    <div className={`fh-flash ${variant}`} role="status" aria-live="polite">
      <span className="txt">{message}</span>
      <button className="close" onClick={hide} aria-label="Fermer">
        <X size={18}/>
      </button>
    </div>
  )
}
