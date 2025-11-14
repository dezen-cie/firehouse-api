import './Header.scss';
import { MessageSquareMore, File as FileIcon, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '../store/useUser';
import { useBadges } from '../store/useBadges';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { connectSocket, reconnectSocketAuth } from '../services/socket';
import Flash from '../components/Flash';

export default function Header() {
  const { user, clear } = useUser();
  const { messages, files, setMessages } = useBadges();
  const [open, setOpen] = useState(false);
  const [socketOk, setSocketOk] = useState(false);
  const nav = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    let mounted = true;

    const s = connectSocket();

    const onConnect = () => setSocketOk(true);
    const onDisconnect = () => setSocketOk(false);

    s?.on('connect', onConnect);
    s?.on('disconnect', onDisconnect);

    api
      .get('/conversations/unread/count')
      .then((r) => {
        if (mounted) {
          setMessages(r.data.count);
        }
        reconnectSocketAuth();
      })
      .catch(() => {
        reconnectSocketAuth();
      });

    return () => {
      mounted = false;
      s?.off('connect', onConnect);
      s?.off('disconnect', onDisconnect);
    };
  }, [setMessages]);

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    
    localStorage.removeItem('accessToken');

    clear();
    reconnectSocketAuth();
    nav('/');
  }

  return (
    <header className="fh-header">
      <div
        className="brand"
        onClick={() => (isAdmin ? nav('/admin') : nav('/dashboard'))}
      >
        <img src="/fire.png" alt="logo" />
        <span className="title">
          {user?.firstName} {user?.lastName}
        </span>
      </div>

      <div className="actions">
        <Link to="/messages" className="icon">
          <MessageSquareMore />
          {messages > 0 && <span className="badge">{messages}</span>}
        </Link>

        {isAdmin && (
          <Link to="/admin/files" className="icon">
            <FileIcon />
            {files > 0 && <span className="badge">{files}</span>}
          </Link>
        )}

        <div className="avatar" onClick={() => setOpen((o) => !o)}>
          <img
            src={user?.avatarUrl || '/illu-pompier.png'}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/illu-pompier.png';
            }}
            alt="avatar"
          />
          <ChevronDown size={16} />
          {open && (
            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
              <Link to="/profile">Profil</Link>
              {isAdmin && <Link to="/admin">Dashboard admin</Link>}
              <button onClick={logout}>Déconnexion</button>
            </div>
          )}
        </div>
      </div>

      <Flash />
    </header>
  );
}
