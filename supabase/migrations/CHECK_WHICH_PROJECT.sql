-- ============================================
-- RUN THIS FIRST — figure out what's actually going on
-- ============================================
-- "relation rooms does not exist" means exactly what it says: there is no
-- table called `rooms` in whatever database this SQL Editor tab is
-- connected to right now. The two realistic explanations:
--
--   (a) You're in a different Supabase project than your app actually
--       uses (easy to do if you have more than one project, or more than
--       one browser tab open to different projects).
--   (b) This really is a brand-new/empty database that's never had any
--       of the schema set up.
--
-- Run the query below and read the result:

SELECT current_database() AS connected_to_database;

-- Then run this one:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- If that second query returns NOTHING (zero rows) — this is genuinely an
-- empty database. Run 000_RUN_ALL_fresh_install.sql in this same project
-- and you're done in one shot.
--
-- If it DOES return a list of tables (users, rooms, bookings, etc.) but
-- you still got "rooms does not exist" earlier — that's very strange and
-- likely means you ran the failing query in a different SQL Editor tab
-- than this one. Check the project name/URL shown in your Supabase
-- dashboard's top bar matches the project your app's NEXT_PUBLIC_SUPABASE_URL
-- in .env.local points to.
