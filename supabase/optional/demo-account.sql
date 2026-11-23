-- Optional: a one-click demo account on the sign-in page. Run after supabase/setup.sql.
-- Visitors look around as Sam Rivera, an example business owner. They can chat with the coach, which uses your
-- Perplexity key, so skip this file if you do not want visitors spending your AI credits.
-- The demo cannot build funnels, connect WhatsApp or change its email or password.
--
-- The email comes from private.gai_config (key demo_email, demo@example.com). The password is public on purpose:
-- the sign-in page uses it for the demo button. If you change it here, change DEMO in js/app.js too.
-- To remove the demo later, run: delete from auth.users where email = 'demo@example.com';

do $$
declare v_id uuid; v_email text := (select value from private.gai_config where key = 'demo_email');
begin
  if v_email is null then raise exception 'Run supabase/setup.sql first, then this file.'; end if;
  select id into v_id from auth.users where lower(email) = lower(v_email);
  if v_id is null then v_id := private.gai_new_user(v_email, 'funnel-os-demo', 'Sam Rivera', true); end if;
  insert into public.gai_members (user_id, status, decided_at, about) values (v_id, 'approved', now(), jsonb_build_object(
    'name', 'Sam Rivera',
    'business', 'Northside Physio, a physiotherapy clinic that also sells an online program',
    'audience', 'Recreational runners aged 30 to 55 with knee pain who want to keep running',
    'offer', 'The Knee Reset, a 6-week online rehab program at $497',
    'stage', 'The clinic is full with local patients. The online program has 12 buyers, all from word of mouth',
    'goal', 'A funnel that brings in online buyers every week, starting without paid ads',
    'stuck', 'Not sure which free offer to lead with or how to write the sales page'))
  on conflict (user_id) do update set status = 'approved', about = excluded.about;
end $$;
