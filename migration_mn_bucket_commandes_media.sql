-- Le bucket de stockage "commandes-media" (photos/vidéos/notes vocales des
-- colis) n'existait pas du tout sur la base M.N — c'est la cause du
-- "Bucket not found" à la création d'un colis avec pièce jointe. Le bucket
-- lui-même a été créé directement (action non destructive, pas de
-- changement de schéma), il manque juste les policies RLS ci-dessous pour
-- qu'un utilisateur connecté puisse lire/déposer/supprimer ses fichiers.
create policy "authenticated_read_commandes_media"
on storage.objects for select
using (bucket_id = 'commandes-media' and auth.role() = 'authenticated');

create policy "authenticated_upload_commandes_media"
on storage.objects for insert
with check (bucket_id = 'commandes-media' and auth.role() = 'authenticated');

create policy "authenticated_delete_commandes_media"
on storage.objects for delete
using (bucket_id = 'commandes-media' and auth.role() = 'authenticated');
