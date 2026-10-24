-- =====================================================================================
-- Ordyx · 0009 · Datos de referencia no personales (géneros iniciales). Editables desde el panel.
-- =====================================================================================
insert into public.genres (slug, name, sort_order) values
  ('electronica', 'Electrónica', 1),
  ('pop', 'Pop', 2),
  ('hip-hop', 'Hip hop', 3),
  ('rock', 'Rock', 4),
  ('indie', 'Indie', 5),
  ('lofi', 'Lo-fi', 6),
  ('ambient', 'Ambient', 7),
  ('jazz', 'Jazz', 8),
  ('clasica', 'Clásica', 9),
  ('urbano', 'Urbano', 10),
  ('flamenco', 'Flamenco', 11),
  ('experimental', 'Experimental', 12)
on conflict (slug) do nothing;
