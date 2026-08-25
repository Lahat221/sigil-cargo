-- ============================================================
-- Documents obligatoires France (§2bis) — déclaration Dakar validée
-- (bouton, pas de fichier) + LTA officielle (fichier uploadé obligatoire).
-- ============================================================

-- ⚠️ AVANT d'exécuter ce script : crée le bucket de stockage "lta-documents"
-- via Supabase Studio → Storage → New bucket, en mode PRIVÉ (public: false),
-- exactement comme "charges-factures". Le script ci-dessous ajoute les
-- colonnes et les policies, mais ne peut pas créer le bucket lui-même.

alter table douane_expeditions_france
  add column if not exists declaration_dakar_validee boolean not null default false,
  add column if not exists lta_fichier_path text;

create policy "authenticated_read_lta_documents"
on storage.objects for select
using (bucket_id = 'lta-documents' and auth.role() = 'authenticated');

create policy "authenticated_upload_lta_documents"
on storage.objects for insert
with check (bucket_id = 'lta-documents' and auth.role() = 'authenticated');

create policy "authenticated_delete_lta_documents"
on storage.objects for delete
using (bucket_id = 'lta-documents' and auth.role() = 'authenticated');
