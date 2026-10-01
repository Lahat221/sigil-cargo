-- Module Publicités : affiches de départ, publicités, réseaux sociaux —
-- géré depuis l'appli, affiché automatiquement sur le site public ("/").
-- Le bucket de stockage "publicites-media" (public, pour les images) a été
-- créé directement (action non destructive, pas de changement de schéma) ;
-- il manque juste la table et les policies ci-dessous.

create table if not exists publicites (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('affiche_depart', 'publicite', 'reseau_social')),
  titre text not null,
  image_path text,
  lien text,
  actif boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table publicites enable row level security;

create policy "authenticated_all_publicites"
on publicites for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- Bucket "publicites-media" : public en lecture (images marketing, aucune
-- confidentialité — contrairement à commandes-media), upload/suppression
-- réservés aux utilisateurs connectés.
create policy "public_read_publicites_media"
on storage.objects for select
using (bucket_id = 'publicites-media');

create policy "authenticated_upload_publicites_media"
on storage.objects for insert
with check (bucket_id = 'publicites-media' and auth.role() = 'authenticated');

create policy "authenticated_delete_publicites_media"
on storage.objects for delete
using (bucket_id = 'publicites-media' and auth.role() = 'authenticated');
