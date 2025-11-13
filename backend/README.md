# Firehouse Backend (final)

## Setup
```bash
cp .env.example .env
npm i
npm run db:migrate
npm run db:seed
npm run dev
```
- API: `http://localhost:4000/api`
- Compte seedé: `super@firehouse.local` / `Super@123`

## Points clés
- JWT + refresh (cookies), Socket.IO temps réel
- Statuts avec commentaire + retourAt (nullable)
- Fichiers: local par défaut, Supabase via env
- Rapports: `/reports/daily?date=YYYY-MM-DD` (buckets horaires + counts)
- Messagerie: conversations, messages, non-lus (`/conversations/unread/count`)
- Vue équipe triée: `/admin/team`
- Super-admin invisible, non modifiable, non supprimable

## Supabase
```
STORAGE_DRIVER=supabase
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_BUCKET=firehouse
```
