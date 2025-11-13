import Header from '../components/Header';
import './MessagesPage.scss';
import { api } from '../services/api';
import { useEffect, useRef, useState, useMemo } from 'react';
import { connectSocket } from '../services/socket';
import { useBadges } from '../store/useBadges';
import { useUser } from '../store/useUser';

type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  createdAt: string;
  readAt?: string | null;
};
type Conversation = {
  id: number;
  user?: { id: number; firstName?: string; lastName?: string; avatarUrl?: string | null };
  admin?: { id: number; firstName?: string; lastName?: string; avatarUrl?: string | null };
  updatedAt?: string;
};

function isTouchDevice() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);
}

export default function MessagesPage() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [openSelect, setOpenSelect] = useState(false);
  const [unreadByConv, setUnreadByConv] = useState<Record<number, boolean>>({});

  const listRef = useRef<HTMLDivElement>(null);
  const ids = useRef<Set<number>>(new Set());
  const activeIdRef = useRef<number | null>(null);
  const meIdRef = useRef<number | null>(null);

  const { setMessages } = useBadges();
  const { user: me } = useUser();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  useEffect(() => { meIdRef.current = me?.id ?? null; }, [me?.id]);
  useEffect(() => { activeIdRef.current = active?.id ?? null; }, [active?.id]);

  const title = useMemo(() => {
    if (!active) return isAdmin ? 'Discussion' : 'Discussion avec l’administration';
    return isAdmin
      ? `Discussion avec ${active.user?.firstName || ''} ${active.user?.lastName || ''}`.trim()
      : 'Discussion avec l’administration';
  }, [active, isAdmin]);

  async function fetchUnreadMap() {
    try {
      const m = await api.get('/conversations/unread/map');
      setUnreadByConv(m.data.map || {});
    } catch {
      setUnreadByConv({});
    }
  }

  async function loadConvos() {
    const r = await api.get('/conversations');
    setConvos(r.data);
    await fetchUnreadMap();
    if (!active && r.data.length) select(r.data[0]);
  }

  async function loadMessages(convId: number) {
    const r = await api.get(`/conversations/${convId}/messages`);
    ids.current = new Set(r.data.map((m: Message) => m.id));
    setMsgs(r.data);

    for (const m of r.data as Message[]) {
      if (m.senderId !== me?.id && !m.readAt) {
        try { await api.patch(`/conversations/messages/${m.id}/read`); } catch {}
      }
    }
    try {
      const u = await api.get('/conversations/unread/count');
      setMessages(u.data.count);
    } catch {}
    requestAnimationFrame(() => { listRef.current?.scrollTo({ top: 1e9 }); });
  }

  async function select(c: Conversation) {
    if (!c) return;
    setActive(c);
    setOpenSelect(false);
    connectSocket()?.emit('conversation:join', c.id);

    await loadMessages(c.id);
    setUnreadByConv(map => ({ ...map, [c.id]: false }));
  }

  async function send() {
    const val = text.trim();
    if (!val) return;

    let conv = active;

    if (!conv) {
      const created = await api.post('/conversations', {});
      conv = created.data as Conversation;
      setActive(conv);
      connectSocket()?.emit('conversation:join', conv.id);
      await loadConvos();
      await loadMessages(conv.id);
    }

    const convId = conv?.id;
    if (!convId) return;

    try {
      await api.post(`/conversations/${convId}/messages`, { content: val });
      setText('');
      setTimeout(() => listRef.current?.scrollTo({ top: 1e9 }), 50);
    } catch {
    }
  }

  async function toggleCreate() {
    if (!isAdmin) return;
    setShowCreate(v => !v);
    if (allUsers.length === 0) {
      try { const r = await api.get('/users'); setAllUsers(r.data); } catch {}
    }
  }

  async function createForUser(userId: number) {
    if (!isAdmin || !userId) return;
    const r = await api.post('/conversations', { userId });
    await loadConvos();
    await select(r.data);
    setShowCreate(false);
  }

  useEffect(() => {
    const s = connectSocket();
    loadConvos();

    const onIncoming = async (payload: any) => {
      const m: Message = payload?.message;
      const convId: number | undefined = payload?.conversationId;
      if (!m || !convId) return;

      const activeId = activeIdRef.current;
      const meId = meIdRef.current;

      if (!activeId || convId !== activeId) {
        if (m.senderId !== meId) {
          setUnreadByConv(map => ({ ...map, [convId]: true }));
          try {
            const r = await api.get('/conversations/unread/count');
            setMessages(r.data.count);
          } catch {}
        }
        return;
      }

      if (ids.current.has(m.id)) return;   
      ids.current.add(m.id);
      setMsgs(prev => [...prev, m]);

      if (m.senderId !== meId) {
        try { await api.patch(`/conversations/messages/${m.id}/read`); } catch {}
        try {
          const r = await api.get('/conversations/unread/count');
          setMessages(r.data.count);
        } catch {}
      }
      requestAnimationFrame(() => { listRef.current?.scrollTo({ top: 1e9 }); });
    };

    const onBadge = async () => {
      try {
        const r = await api.get('/conversations/unread/count');
        setMessages(r.data.count);
        await fetchUnreadMap();
      } catch {}
    };

    s?.on('conversation:message', onIncoming);
    s?.on('badge:update', onBadge);

    return () => {
      s?.off('conversation:message', onIncoming);
      s?.off('badge:update', onBadge);
    };
  }, []); 

  // Règles clavier
  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter') return;
    const touch = isTouchDevice();
    if (touch) { return; }
    if (e.shiftKey) { return; }
    e.preventDefault();
    send();
  }

  function SelectConvo() {
    const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';
    if (!isAdmin) return null;
    const currentLabel = active ? `${active.user?.firstName || ''} ${active.user?.lastName || ''}`.trim() : 'Sélectionner une conversation';
    return (
      <div className="select-wrap">
        <button type="button" className="select-button" onClick={() => setOpenSelect(o => !o)}>
          <span className="label">{currentLabel || 'Sélectionner une conversation'}</span>
          <span className="chev">▾</span>
        </button>
        {openSelect && (
          <div className="select-list" role="listbox" onMouseLeave={() => setOpenSelect(false)}>
            {convos.map(c => (
              <div
                key={c.id}
                className="select-item"
                role="option"
                aria-selected={active?.id === c.id}
                onClick={() => select(c)}
              >
                <span className="name">{(c.user?.firstName || '').trim()} {(c.user?.lastName || '').trim()}</span>
                {unreadByConv[c.id] && <span className="dot" aria-label="non lu" />}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="messages-page">
      <Header />
      <div className="chat-only">

        {isAdmin && (
          <div className="row row-top">
            <SelectConvo />
            <button onClick={toggleCreate}>+ Nouvelle</button>
            {showCreate && (
              <select className="create-select" defaultValue="" onChange={e => createForUser(Number(e.target.value))}>
                <option value="" disabled>Choisir un utilisateur…</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.email}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="row title">{title}</div>

        <div className="list" ref={listRef}>
          {msgs.map((m) => (
            <div className={'msg ' + (m.senderId === me?.id ? 'right mine' : 'left')} key={m.id}>
              <div className="bubble">{m.content}</div>
            </div>
          ))}
        </div>

        <div className="composer">
          <textarea
            placeholder="Votre message…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={1}
          />
          <button onClick={send}>Envoyer</button>
        </div>

      </div>
    </div>
  );
}
