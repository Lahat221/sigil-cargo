# SIGIL CARGO V2 — Module Commandes

Application de gestion de commandes pour le fret aérien Dakar → France.

## Stack

- Next.js 14 (App Router, TypeScript)
- Supabase (Postgres + Auth + Storage)
- Tailwind CSS
- Déploiement cible : Vercel

## Setup

1. Copier `.env.local.example` en `.env.local` et renseigner les clés du projet Supabase (Settings → API) :

   ```bash
   cp .env.local.example .env.local
   ```

2. Dans l'éditeur SQL de Supabase, exécuter `schema_supabase_commandes.sql` pour créer les tables, l'enum de statuts, les triggers (`log_changement_statut`, `enqueue_notification_statut`) et les policies RLS de base.

3. Regénérer les types TypeScript à partir du schéma réel une fois le projet créé (les types dans `src/types/database.types.ts` sont pour l'instant écrits à la main d'après le schéma) :

   ```bash
   npx supabase login
   SUPABASE_PROJECT_ID=xxxxxxxx npm run gen:types
   ```

4. Lancer le serveur de dev :

   ```bash
   npm run dev
   ```

## Structure

- `src/lib/supabase/client.ts` — client Supabase côté navigateur (Client Components)
- `src/lib/supabase/server.ts` — client Supabase côté serveur (Server Components, Route Handlers)
- `src/lib/supabase/middleware.ts` + `middleware.ts` — rafraîchissement de session
- `src/types/database.types.ts` — types générés depuis le schéma Postgres
- `schema_supabase_commandes.sql` — schéma de référence à exécuter dans Supabase
