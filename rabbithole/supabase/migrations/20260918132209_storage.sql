-- Storage buckets for listing photos and avatars.
--
-- Owns: the two buckets and who may write into them.
-- Does not own: resizing or format conversion. Unresized phone photos will
--   dominate the free tier — see ARCHITECTURE.md -> Open questions.
--
-- Path convention, and the reason for it:
--
--   listing-images/{user_id}/{listing_id}/{position}.jpg
--   avatars/{user_id}/avatar.jpg
--
-- The owner's uuid must be the FIRST path segment, because the policies below
-- match (storage.foldername(name))[1] against auth.uid(). Any other layout
-- silently breaks write authorization.

insert into storage.buckets (id, name, public)
values
  ('listing-images', 'listing-images', true),
  ('avatars',        'avatars',        true)
on conflict (id) do nothing;

-- Public read is deliberate. Listing photos are advertisements; signed URLs
-- would add an expiry to manage and a round trip to every card in the feed,
-- for no privacy gain. Write access is still strictly owner-only.
create policy "listing images and avatars are publicly readable"
  on storage.objects for select
  using (bucket_id in ('listing-images', 'avatars'));

create policy "a user writes only into their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "a user updates only their own objects"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "a user deletes only their own objects"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('listing-images', 'avatars')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
