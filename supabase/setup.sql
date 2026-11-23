-- Funnel OS database. Run this whole file once in the Supabase SQL Editor (SETUP.md, step 2).
-- Safe to run again after an update: it adds what is missing and replaces the functions. It does not delete your data.
-- It runs as one transaction, so if it stops with an error, nothing is saved and you can run it again.
-- Next: run supabase/library.sql to load the coach library. supabase/optional/demo-account.sql adds a one-click demo.
--
-- How it is built: every table is closed to the browser (row level security on, no grants). The app reads and writes
-- through the functions below, which check who is asking first. API keys arrive sealed by the server (GAI_ENC_KEY).


begin;

-- ====================================================================================================
-- 1. Members, chats, usage and settings
-- ====================================================================================================
-- Members are approved by hand. The admin is the account whose confirmed email is in private.gai_config (key admin_email).
-- It starts empty: the first account that signs up fills it in (see gai_signup below).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.gai_config (key text primary key, value text not null);
insert into private.gai_config (key, value) values ('admin_email', '') on conflict (key) do nothing;

create table if not exists public.gai_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  about jsonb not null default '{}'::jsonb check (pg_column_size(about) < 8000),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);

create table if not exists public.gai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New question' check (char_length(title) <= 200),
  channel text not null default 'general' check (channel ~ '^[a-z][a-z-]{1,30}$'),
  mode text not null default 'ask' check (mode in ('ask', 'review', 'roleplay')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gai_threads_user on public.gai_threads (user_id, channel, updated_at desc);

create table if not exists public.gai_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.gai_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(body) <= 40000),
  sources jsonb not null default '[]'::jsonb,
  related jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gai_messages_thread on public.gai_messages (thread_id, id);

-- Logged for the admin screen only. There is no cap.
create table if not exists public.gai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  asks integer not null default 0,
  talks integer not null default 0,
  primary key (user_id, day)
);

-- App settings the admin picks in Members and settings: the model, the voice, WhatsApp, Funnel OS access,
-- and where pending members go to ask about access.
create table if not exists public.gai_settings (
  key text primary key check (key in ('model', 'help_url', 'welcome', 'wa_phone_id', 'wa_waba_id', 'wa_number', 'wa_name', 'voice_id', 'voice_name', 'wa_voice', 'fos_access')),
  value text not null default '' check (char_length(value) <= 600),
  updated_at timestamptz not null default now()
);

alter table public.gai_settings enable row level security;
alter table public.gai_members enable row level security;
alter table public.gai_threads enable row level security;
alter table public.gai_messages enable row level security;
alter table public.gai_usage enable row level security;
revoke all on public.gai_settings, public.gai_members, public.gai_threads, public.gai_messages, public.gai_usage from public, anon, authenticated;

create or replace function private.gai_admin(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and exists (select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null
    and lower(u.email) = lower((select value from private.gai_config where key = 'admin_email')));
$$;
create or replace function private.gai_ok(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and (private.gai_admin(uid) or exists (select 1 from public.gai_members m where m.user_id = uid and m.status = 'approved'));
$$;
create or replace function private.gai_need() returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.gai_ok(auth.uid()) then raise exception 'Your Funnel OS access is waiting for approval' using errcode = '42501'; end if;
  return auth.uid();
end $$;
create or replace function private.gai_need_admin() returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.gai_admin(auth.uid()) then raise exception 'Only the admin can open this' using errcode = '42501'; end if;
  return auth.uid();
end $$;

create or replace function public.gai_thread_get(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); t public.gai_threads;
begin
  select * into t from public.gai_threads where id = p_id and user_id = v_uid;
  if not found then raise exception 'This conversation was deleted or belongs to another account' using errcode = 'P0002'; end if;
  return jsonb_build_object('id', t.id, 'title', t.title, 'channel', t.channel, 'mode', t.mode, 'messages', coalesce((select jsonb_agg(jsonb_build_object('role', m.role, 'body', m.body,
    'sources', m.sources, 'related', m.related, 'files', m.files, 'at', m.created_at) order by m.id) from public.gai_messages m where m.thread_id = t.id), '[]'::jsonb));
end $$;

create or replace function public.gai_admin_set(p_user uuid, p_status text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need_admin(); r public.gai_members;
begin
  if p_status not in ('pending', 'approved', 'revoked') then raise exception 'Unknown status'; end if;
  if p_user = v_uid then raise exception 'You cannot change your own access'; end if;
  update public.gai_members set status = p_status, decided_at = now(), decided_by = v_uid where user_id = p_user returning * into r;
  if not found then raise exception 'No such member'; end if;
  return jsonb_build_object('user_id', r.user_id, 'status', r.status);
end $$;

create or replace function public.gai_admin_settings() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need_admin();
begin
  return coalesce((select jsonb_object_agg(key, value) from public.gai_settings), '{}'::jsonb);
end $$;


-- ====================================================================================================
-- 2. The coaching library and the owner's sealed API keys
-- ====================================================================================================
-- The library is loaded with supabase/starter-library.sql (or your own, built by scripts/build-library.js).
-- The admin adds the API keys inside the app, in Members and settings.

create table if not exists public.gai_lib_sources (
  id uuid primary key,
  kind text not null,
  title text not null,
  url text,
  chars integer not null default 0,
  published_at timestamptz
);
create table if not exists public.gai_lib_chunks (
  id bigint primary key,
  source_id uuid not null references public.gai_lib_sources(id) on delete cascade,
  idx integer not null default 0,
  at_s integer,
  body text not null,
  tsv tsvector generated always as (to_tsvector('english', body)) stored
);
create index if not exists gai_lib_chunks_tsv on public.gai_lib_chunks using gin (tsv);
create index if not exists gai_lib_chunks_src on public.gai_lib_chunks (source_id, idx);
create table if not exists public.gai_lib_playbook (
  id uuid primary key,
  topic text not null default '',
  question text not null,
  keywords text not null default '',
  answer text not null,
  sources text[] not null default '{}',
  position integer not null default 0,
  tsv tsvector generated always as (setweight(to_tsvector('english', question || ' ' || keywords), 'A') || setweight(to_tsvector('english', answer), 'B')) stored
);
create index if not exists gai_lib_playbook_tsv on public.gai_lib_playbook using gin (tsv);

-- The owner's API keys. Sealed by the server before they arrive, so the database never sees a plain key.
create table if not exists private.gai_keys (
  provider text primary key check (provider in ('perplexity', 'elevenlabs', 'whatsapp', 'whatsapp_secret', 'openrouter', 'github', 'vercel')),
  ciphertext text not null check (ciphertext like 'v1.%'),
  last4 text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.gai_lib_sources enable row level security;
alter table public.gai_lib_chunks enable row level security;
alter table public.gai_lib_playbook enable row level security;
revoke all on public.gai_lib_sources, public.gai_lib_chunks, public.gai_lib_playbook from public, anon, authenticated;
revoke all on private.gai_keys from public, anon, authenticated;

-- The Library screen: every source plus the Playbook questions. Members only.
create or replace function public.gai_vault() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_need();
  return jsonb_build_object(
    'sources', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'kind', s.kind, 'title', s.title, 'url', case when s.kind = 'youtube' then s.url end,
        'chars', s.chars, 'published_at', s.published_at,
        'preview', (select left(c.body, 260) from public.gai_lib_chunks c where c.source_id = s.id order by c.idx limit 1))
        order by s.published_at desc nulls last) from public.gai_lib_sources s), '[]'::jsonb),
    'plays', coalesce((select jsonb_agg(jsonb_build_object('topic', p.topic, 'question', p.question) order by p.topic, p.position)
      from public.gai_lib_playbook p), '[]'::jsonb));
end $$;

-- Admin: which keys are in, by last four characters only.
create or replace function public.gai_admin_keys() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_need_admin();
  return coalesce((select jsonb_object_agg(provider, jsonb_build_object('last4', last4, 'updated_at', updated_at)) from private.gai_keys), '{}'::jsonb);
end $$;


-- ====================================================================================================
-- 3. Accounts without emails, one-time password links and the optional demo account
-- ====================================================================================================
-- Members are approved by hand, so sign-up does not need a confirmation email. Password links come from the admin.

create table if not exists private.gai_codes (
  code_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('setup', 'reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
revoke all on private.gai_codes from public, anon, authenticated;

insert into private.gai_config (key, value) values ('demo_email', 'demo@example.com') on conflict (key) do nothing;
alter table public.gai_threads add column if not exists pinned boolean not null default false;

create or replace function private.gai_demo(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and exists (select 1 from auth.users u where u.id = uid
    and lower(u.email) = lower((select value from private.gai_config where key = 'demo_email')));
$$;

-- Creates a sign-in account directly. Confirmed accounts can sign in right away.
create or replace function private.gai_new_user(p_email text, p_password text, p_name text, p_confirmed boolean) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(trim(p_email));
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    case when p_confirmed then now() end, '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', left(trim(coalesce(p_name, '')), 80), 'app', 'funnel-os'),
    now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', p_confirmed, 'phone_verified', false), 'email', now(), now(), now());
  return v_id;
end $$;

-- A one-time password link code. Only its hash is stored.
create or replace function private.gai_issue_code(p_user uuid, p_purpose text) returns text language plpgsql security definer set search_path = '' as $$
declare v_code text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  update private.gai_codes set used_at = now() where user_id = p_user and used_at is null;
  insert into private.gai_codes (code_hash, user_id, purpose, expires_at) values (encode(extensions.digest(v_code, 'sha256'), 'hex'), p_user, p_purpose, now() + interval '7 days');
  return v_code;
end $$;

-- Sign up: name, email and password. The account waits for the admin's approval.
-- The first account on a new install becomes the admin, so the owner signs up first, right after setup.
create or replace function public.gai_signup(p_email text, p_password text, p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); v_admin boolean := false;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then raise exception 'Enter a valid email address' using errcode = '22023'; end if;
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'Use at least 8 characters for your password' using errcode = '22023'; end if;
  if length(trim(coalesce(p_name, ''))) < 1 then raise exception 'Add your name so the admin knows who you are' using errcode = '22023'; end if;
  if v_email = lower(coalesce((select value from private.gai_config where key = 'demo_email'), '')) then
    raise exception 'That email is reserved. Sign in instead, or use another email' using errcode = '22023'; end if;
  -- One sign-up at a time, so two people cannot both become the first admin.
  perform pg_advisory_xact_lock(hashtext('gai_signup'));
  if exists (select 1 from auth.users where lower(email) = v_email) then raise exception 'That email already has an account' using errcode = '23505'; end if;
  if (select count(*) from auth.users where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Lots of sign-ups right now. Try again in an hour' using errcode = '54000'; end if;
  perform private.gai_new_user(v_email, p_password, p_name, true);
  if coalesce((select value from private.gai_config where key = 'admin_email'), '') = '' then
    insert into private.gai_config (key, value) values ('admin_email', v_email) on conflict (key) do update set value = excluded.value;
    v_admin := true;
  end if;
  return jsonb_build_object('ok', true, 'admin', v_admin);
end $$;

-- Who a password link is for, before the password is set.
create or replace function public.gai_code_check(p_code text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r record;
begin
  select c.purpose, u.email, c.expires_at, c.used_at into r from private.gai_codes c join auth.users u on u.id = c.user_id
   where c.code_hash = encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex');
  if not found or r.used_at is not null or r.expires_at < now() then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'email', r.email, 'purpose', r.purpose);
end $$;

-- Sets the password from a one-time link. Also confirms the email, since the link came from the admin.
create or replace function public.gai_set_password(p_code text, p_password text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c private.gai_codes; v_email text;
begin
  if length(coalesce(p_password, '')) < 8 or length(p_password) > 72 then raise exception 'Use at least 8 characters for your password' using errcode = '22023'; end if;
  select * into c from private.gai_codes where code_hash = encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex') for update;
  if not found or c.used_at is not null or c.expires_at < now() then
    raise exception 'This link was already used or has expired. Ask the admin for a new one' using errcode = '22023'; end if;
  update private.gai_codes set used_at = now() where code_hash = c.code_hash;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
   where id = c.user_id returning email into v_email;
  return jsonb_build_object('ok', true, 'email', v_email);
end $$;

-- What the sign-in page may know before anyone signs in: where to reach the admin, the demo email when the
-- demo account exists (supabase/optional/demo-account.sql), and whether this is a new install with no admin yet.
create or replace function public.gai_public() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'help_url', (select nullif(value, '') from public.gai_settings where key = 'help_url'),
    'demo', (select u.email from auth.users u where lower(u.email) = lower((select value from private.gai_config where key = 'demo_email')) limit 1),
    'setup', coalesce((select value from private.gai_config where key = 'admin_email'), '') = '');
$$;

-- Admin: a one-time link a member can use to choose a new password.
create or replace function public.gai_admin_reset_link(p_user uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need_admin();
begin
  if not exists (select 1 from public.gai_members where user_id = p_user) then raise exception 'No such member'; end if;
  if private.gai_demo(p_user) then raise exception 'The demo account has a fixed password'; end if;
  return private.gai_issue_code(p_user, 'reset');
end $$;

-- The demo account keeps its email and password, whatever a visitor tries.
create or replace function private.gai_demo_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(old.email) = lower((select value from private.gai_config where key = 'demo_email')) then
    new.email := old.email; new.encrypted_password := old.encrypted_password;
  end if;
  return new;
end $$;
drop trigger if exists gai_demo_guard on auth.users;
create trigger gai_demo_guard before update on auth.users for each row execute function private.gai_demo_guard();

-- Who am I, now with the demo flag. Demo is approved from the start.
create or replace function public.gai_me() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); m public.gai_members; v_admin boolean; v_demo boolean; u auth.users;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '28000'; end if;
  v_admin := private.gai_admin(v_uid); v_demo := private.gai_demo(v_uid);
  insert into public.gai_members (user_id, status, decided_at) values (v_uid, case when v_admin or v_demo then 'approved' else 'pending' end, case when v_admin or v_demo then now() end)
  on conflict (user_id) do nothing;
  select * into m from public.gai_members where user_id = v_uid;
  select * into u from auth.users where id = v_uid;
  return jsonb_build_object('status', case when v_admin then 'approved' else m.status end, 'admin', v_admin, 'demo', v_demo, 'about', m.about,
    'name', nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''), 'email', u.email, 'since', m.requested_at,
    'help_url', (select value from public.gai_settings where key = 'help_url'), 'welcome', (select value from public.gai_settings where key = 'welcome'));
end $$;

-- The demo business profile stays as it is, so every visitor sees the same example.
create or replace function public.gai_about_set(p_about jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); v jsonb := '{}'::jsonb; k text;
begin
  if private.gai_demo(v_uid) then return (select about from public.gai_members where user_id = v_uid); end if;
  foreach k in array array['name', 'business', 'audience', 'offer', 'stage', 'goal', 'stuck'] loop
    if p_about ? k then v := v || jsonb_build_object(k, left(coalesce(p_about->>k, ''), 600)); end if;
  end loop;
  update public.gai_members set about = v where user_id = v_uid;
  return v;
end $$;

create or replace function public.gai_threads_list() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'channel', t.channel, 'mode', t.mode, 'updated_at', t.updated_at, 'pinned', t.pinned) order by t.updated_at desc)
    from (select * from public.gai_threads where user_id = v_uid order by updated_at desc limit 200) t), '[]'::jsonb);
end $$;

-- The demo's example chats cannot be deleted.
create or replace function public.gai_thread_delete(p_id uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need();
begin
  delete from public.gai_threads where id = p_id and user_id = v_uid and not (pinned and private.gai_demo(v_uid));
  return found;
end $$;

-- Saves one question and its answer. On the demo account, visitors' own chats are cleared after 30 minutes.
create or replace function public.gai_save_turn(p_thread uuid, p_channel text, p_mode text, p_question text, p_answer text, p_sources jsonb default '[]', p_related jsonb default '[]', p_files jsonb default '[]')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); v_id uuid := p_thread;
begin
  if private.gai_demo(v_uid) then
    delete from public.gai_threads where user_id = v_uid and not pinned and updated_at < now() - interval '30 minutes';
  end if;
  if v_id is not null and not exists (select 1 from public.gai_threads where id = v_id and user_id = v_uid) then v_id := null; end if;
  if v_id is null then
    insert into public.gai_threads (user_id, title, channel, mode) values (v_uid, left(regexp_replace(coalesce(nullif(trim(p_question), ''), 'Shared a file'), '\s+', ' ', 'g'), 120),
      case when p_channel ~ '^[a-z][a-z-]{1,30}$' then p_channel else 'general' end,
      case when p_mode in ('ask', 'review', 'roleplay') then p_mode else 'ask' end) returning id into v_id;
  else
    update public.gai_threads set updated_at = now() where id = v_id;
  end if;
  insert into public.gai_messages (thread_id, user_id, role, body, files) values (v_id, v_uid, 'user', left(coalesce(p_question, ''), 40000), coalesce(p_files, '[]'));
  insert into public.gai_messages (thread_id, user_id, role, body, sources, related) values (v_id, v_uid, 'assistant', left(coalesce(p_answer, ''), 40000), coalesce(p_sources, '[]'), coalesce(p_related, '[]'));
  return v_id;
end $$;

-- Admin member list, now marking the demo account.
create or replace function public.gai_admin_members() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need_admin();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'email', u.email, 'name', nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''), 'status', m.status,
      'requested_at', m.requested_at, 'decided_at', m.decided_at, 'last_sign_in', u.last_sign_in_at, 'confirmed', u.email_confirmed_at is not null,
      'asks_30d', coalesce((select sum(g.asks) from public.gai_usage g where g.user_id = m.user_id and g.day > current_date - 30), 0),
      'talks_30d', coalesce((select sum(g.talks) from public.gai_usage g where g.user_id = m.user_id and g.day > current_date - 30), 0),
      'admin', private.gai_admin(m.user_id), 'demo', private.gai_demo(m.user_id))
    order by (m.status = 'pending') desc, private.gai_demo(m.user_id), m.requested_at desc)
    from public.gai_members m join auth.users u on u.id = m.user_id), '[]'::jsonb);
end $$;


-- ====================================================================================================
-- 4. One AI key: Perplexity reaches Claude, GPT, Gemini and Grok with web search
-- ====================================================================================================
-- Checks access before the server reads the library. Logs one question or one voice call when asked to.
create or replace function public.gai_check(p_log text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need();
begin
  if p_log = 'ask' then
    insert into public.gai_usage (user_id, day, asks) values (v_uid, current_date, 1) on conflict (user_id, day) do update set asks = public.gai_usage.asks + 1;
  elsif p_log = 'talk' then
    insert into public.gai_usage (user_id, day, talks) values (v_uid, current_date, 1) on conflict (user_id, day) do update set talks = public.gai_usage.talks + 1;
  end if;
  return jsonb_build_object('ok', true);
end $$;


-- ====================================================================================================
-- 5. WhatsApp: members text or send a voice note, the coach answers by text or voice note
-- ====================================================================================================
-- The admin reads a sealed key back on the server, for example to list ElevenLabs voices. Admin only.
create or replace function public.gai_admin_key_get(p_provider text) returns text language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_need_admin();
  return (select ciphertext from private.gai_keys where provider = p_provider);
end $$;

-- Members' requests only ever need the Perplexity key. The WhatsApp and voice keys stay with the admin and the webhook.
create or replace function public.gai_owner_key(p_provider text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r private.gai_keys;
begin
  perform private.gai_need();
  if p_provider <> 'perplexity' then return null; end if;
  select * into r from private.gai_keys where provider = p_provider;
  if not found then return null; end if;
  return jsonb_build_object('ciphertext', r.ciphertext,
    'meta', jsonb_build_object('model', (select nullif(value, '') from public.gai_settings where key = 'model')));
end $$;

-- The server stores the hash of its WhatsApp token. Admin only.
create or replace function public.gai_admin_wa_server(p_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform private.gai_need_admin();
  if coalesce(p_hash, '') !~ '^[0-9a-f]{64}$' then raise exception 'Bad token' using errcode = '22023'; end if;
  insert into private.gai_config (key, value) values ('wa_server', p_hash) on conflict (key) do update set value = excluded.value;
  return true;
end $$;

-- What the admin sees about WhatsApp: linked members and when the last message came in.
create or replace function public.gai_admin_wa() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_need_admin();
  return jsonb_build_object(
    'server', exists (select 1 from private.gai_config where key = 'wa_server'),
    'last_in', (select value from private.gai_config where key = 'wa_last_in'),
    'linked', (select count(*) from private.gai_wa_links));
end $$;

-- Linked numbers. One number per member, one member per number.
create table if not exists private.gai_wa_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique check (phone ~ '^[0-9]{6,20}$'),
  thread_id uuid references public.gai_threads(id) on delete set null,
  linked_at timestamptz not null default now(),
  last_at timestamptz
);
-- Connect codes a member sends from WhatsApp to prove the number is theirs. Stored as hashes, valid for 30 minutes.
create table if not exists private.gai_wa_codes (
  code_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
-- Meta can send the same message twice. Each message is handled once.
create table if not exists private.gai_wa_seen (id text primary key, at timestamptz not null default now());
-- Wrong codes per number, so codes cannot be guessed.
create table if not exists private.gai_wa_tries (phone text not null, at timestamptz not null default now());
create index if not exists gai_wa_tries_phone on private.gai_wa_tries (phone, at);
revoke all on private.gai_wa_links, private.gai_wa_codes, private.gai_wa_seen, private.gai_wa_tries from public, anon, authenticated;

create or replace function private.gai_wa_ok(p_token text) returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(p_token, '') = '' or not exists (select 1 from private.gai_config where key = 'wa_server' and value = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end $$;

-- Member: is WhatsApp on, and is my number linked.
create or replace function public.gai_wa_me() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); l private.gai_wa_links;
begin
  select * into l from private.gai_wa_links where user_id = v_uid;
  return jsonb_build_object(
    'enabled', exists (select 1 from private.gai_config where key = 'wa_server') and exists (select 1 from private.gai_keys where provider = 'whatsapp')
      and exists (select 1 from public.gai_settings where key = 'wa_number'),
    'number', (select value from public.gai_settings where key = 'wa_number'),
    'name', (select value from public.gai_settings where key = 'wa_name'),
    'voice', exists (select 1 from private.gai_keys where provider = 'elevenlabs') and exists (select 1 from public.gai_settings where key = 'voice_id')
      and coalesce((select value from public.gai_settings where key = 'wa_voice'), 'voice') <> 'off',
    'linked', case when l.user_id is null then null else '+' || left(l.phone, 3) || repeat('*', greatest(length(l.phone) - 5, 0)) || right(l.phone, 2) end,
    'linked_at', l.linked_at, 'demo', private.gai_demo(v_uid));
end $$;

-- Member: a fresh connect code. Older codes stop working.
create or replace function public.gai_wa_code() returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); v_code text;
begin
  if private.gai_demo(v_uid) then raise exception 'The demo account cannot connect WhatsApp. Sign in with your own account first.' using errcode = '42501'; end if;
  delete from private.gai_wa_codes where user_id = v_uid or expires_at < now();
  loop
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from private.gai_wa_codes where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex'));
  end loop;
  insert into private.gai_wa_codes (code_hash, user_id, expires_at) values (encode(extensions.digest(v_code, 'sha256'), 'hex'), v_uid, now() + interval '30 minutes');
  return jsonb_build_object('code', v_code, 'expires_at', now() + interval '30 minutes');
end $$;

-- Member: disconnect my number.
create or replace function public.gai_wa_unlink() returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); v_n integer;
begin
  delete from private.gai_wa_links where user_id = v_uid;
  get diagnostics v_n = row_count;
  delete from private.gai_wa_codes where user_id = v_uid;
  return v_n > 0;
end $$;

-- Server: the sealed keys and the WhatsApp settings.
create or replace function public.gai_wa_config(p_token text) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_wa_ok(p_token);
  return jsonb_build_object(
    'keys', coalesce((select jsonb_object_agg(provider, ciphertext) from private.gai_keys), '{}'::jsonb),
    'settings', coalesce((select jsonb_object_agg(key, value) from public.gai_settings), '{}'::jsonb));
end $$;

-- Server: one incoming message. Handles each message once, links a number when it sends a valid code,
-- and says who is writing and whether they have access.
create or replace function public.gai_wa_in(p_token text, p_msg_id text, p_phone text, p_text text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'); v_code text; v_uid uuid; l private.gai_wa_links; m public.gai_members; u auth.users; v_linked boolean := false; v_admin boolean;
begin
  perform private.gai_wa_ok(p_token);
  if v_phone !~ '^[0-9]{6,20}$' then raise exception 'Bad number' using errcode = '22023'; end if;
  insert into private.gai_wa_seen (id) values (left(coalesce(p_msg_id, ''), 200)) on conflict do nothing;
  if not found then return jsonb_build_object('dup', true); end if;
  delete from private.gai_wa_seen where at < now() - interval '7 days';
  insert into private.gai_config (key, value) values ('wa_last_in', now()::text) on conflict (key) do update set value = excluded.value;

  -- "Connect 123456" or just the six digits.
  v_code := substring(coalesce(p_text, '') from '(?:^|\D)(\d{6})(?:\D|$)');
  if v_code is not null and length(coalesce(p_text, '')) < 60 then
    delete from private.gai_wa_tries where at < now() - interval '1 hour';
    if (select count(*) from private.gai_wa_tries where phone = v_phone) >= 8 then
      return jsonb_build_object('status', 'locked');
    end if;
    select user_id into v_uid from private.gai_wa_codes where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex') and expires_at > now();
    if v_uid is null then
      insert into private.gai_wa_tries (phone) values (v_phone);
      if not exists (select 1 from private.gai_wa_links where phone = v_phone) then return jsonb_build_object('status', 'bad_code'); end if;
    else
      delete from private.gai_wa_codes where user_id = v_uid;
      delete from private.gai_wa_links where phone = v_phone and user_id <> v_uid;
      insert into private.gai_wa_links (user_id, phone) values (v_uid, v_phone)
      on conflict (user_id) do update set phone = excluded.phone, linked_at = now(), thread_id = null;
      v_linked := true;
    end if;
  end if;

  select * into l from private.gai_wa_links where phone = v_phone;
  if l.user_id is null then return jsonb_build_object('status', 'none'); end if;
  update private.gai_wa_links set last_at = now() where user_id = l.user_id;
  v_admin := private.gai_admin(l.user_id);
  select * into m from public.gai_members where user_id = l.user_id;
  select * into u from auth.users where id = l.user_id;
  return jsonb_build_object('linked_now', v_linked, 'user_id', l.user_id,
    'status', case when v_admin then 'approved' else coalesce(m.status, 'pending') end,
    'name', nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''), 'about', coalesce(m.about, '{}'::jsonb),
    'thread_id', l.thread_id,
    'history', coalesce((select jsonb_agg(jsonb_build_object('role', x.role, 'body', left(x.body, 3000)) order by x.id) from
      (select id, role, body from public.gai_messages where thread_id = l.thread_id and l.thread_id is not null and created_at > now() - interval '24 hours' order by id desc limit 8) x), '[]'::jsonb));
end $$;

-- The library lookup, shared by members on the site and the WhatsApp server.
create or replace function private.gai_lookup_core(p_q text, p_limit integer default 8) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_tq tsquery; v_and tsquery; v_lim integer := least(greatest(coalesce(p_limit, 8), 1), 10); v_plays jsonb; v_passages jsonb;
begin
  v_and := plainto_tsquery('english', left(coalesce(p_q, ''), 500));
  v_tq := nullif(replace(v_and::text, ' & ', ' | '), '')::tsquery;
  if v_tq is null then return jsonb_build_object('plays', '[]'::jsonb, 'passages', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(x order by (x->>'score')::numeric desc), '[]'::jsonb) into v_plays from (
    select jsonb_build_object('question', p.question, 'topic', p.topic, 'answer', p.answer, 'sources', to_jsonb(p.sources),
      'score', round((ts_rank(p.tsv, v_tq, 1) * 10)::numeric, 3)) x
    from public.gai_lib_playbook p
    where p.tsv @@ v_tq and ts_rank(setweight(to_tsvector('english', p.question || ' ' || p.keywords), 'A'), v_tq, 1) >= 0.05
    order by ts_rank(p.tsv, v_tq, 1) desc limit 2
  ) s;
  select coalesce(jsonb_agg(jsonb_build_object('source_id', r.source_id, 'title', r.title, 'kind', r.kind, 'url', r.url, 'at_s', r.at_s, 'body', r.body, 'published_at', r.published_at)), '[]'::jsonb) into v_passages from (
    select s.id source_id, s.title, s.kind, s.url, c.at_s, left(c.body, 1800) body, s.published_at
    from public.gai_lib_chunks c join public.gai_lib_sources s on s.id = c.source_id
    where c.tsv @@ v_tq
    order by ts_rank_cd(c.tsv, v_tq) * case when c.tsv @@ v_and then 1.6 else 1 end desc limit v_lim * 2
  ) r;
  return jsonb_build_object('plays', v_plays, 'passages', v_passages);
end $$;

create or replace function public.gai_lookup(p_q text, p_limit integer default 8) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_need();
  return private.gai_lookup_core(p_q, p_limit);
end $$;

-- Server: library lookup for an approved, linked member.
create or replace function public.gai_wa_lookup(p_token text, p_user uuid, p_q text, p_limit integer default 8) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_wa_ok(p_token);
  if not exists (select 1 from private.gai_wa_links where user_id = p_user) or not private.gai_ok(p_user) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return private.gai_lookup_core(p_q, p_limit);
end $$;

-- Server: saves one WhatsApp question and answer into the member's WhatsApp conversation, so it also shows on the site.
create or replace function public.gai_wa_save(p_token text, p_user uuid, p_question text, p_answer text, p_kind text default 'text', p_sources jsonb default '[]') returns uuid language plpgsql security definer set search_path = '' as $$
declare l private.gai_wa_links; v_id uuid;
begin
  perform private.gai_wa_ok(p_token);
  select * into l from private.gai_wa_links where user_id = p_user;
  if l.user_id is null or not private.gai_ok(p_user) then raise exception 'Not allowed' using errcode = '42501'; end if;
  v_id := l.thread_id;
  -- A new conversation after a quiet day, so old chats do not grow forever.
  if v_id is not null and not exists (select 1 from public.gai_threads where id = v_id and user_id = p_user and updated_at > now() - interval '24 hours') then v_id := null; end if;
  if v_id is null then
    insert into public.gai_threads (user_id, title, channel, mode) values (p_user, left('WhatsApp: ' || regexp_replace(coalesce(nullif(trim(p_question), ''), 'Voice note'), '\s+', ' ', 'g'), 120), 'general', 'ask') returning id into v_id;
    update private.gai_wa_links set thread_id = v_id where user_id = p_user;
  else
    update public.gai_threads set updated_at = now() where id = v_id;
  end if;
  insert into public.gai_messages (thread_id, user_id, role, body, files) values (v_id, p_user, 'user', left(coalesce(p_question, ''), 40000),
    jsonb_build_array(jsonb_build_object('name', case when p_kind = 'voice' then 'Voice note on WhatsApp' else 'Sent on WhatsApp' end, 'kind', 'whatsapp')));
  insert into public.gai_messages (thread_id, user_id, role, body, sources) values (v_id, p_user, 'assistant', left(coalesce(p_answer, ''), 40000), coalesce(p_sources, '[]'));
  if p_kind = 'voice' then
    insert into public.gai_usage (user_id, day, talks) values (p_user, current_date, 1) on conflict (user_id, day) do update set talks = public.gai_usage.talks + 1;
  else
    insert into public.gai_usage (user_id, day, asks) values (p_user, current_date, 1) on conflict (user_id, day) do update set asks = public.gai_usage.asks + 1;
  end if;
  return v_id;
end $$;


-- ====================================================================================================
-- 6. Funnel OS: a quiz, then an agent researches, writes, designs, builds and deploys funnel options
-- ====================================================================================================
-- A member answers a quiz and an agent researches, writes, wireframes, designs, builds, checks and deploys
-- 1 to 3 funnel options to live preview links. The member approves one, and it goes live.
-- The owner pays: Perplexity runs the AI, GitHub and Vercel host the funnels, OpenRouter (optional) draws images.
-- Keys stay sealed in private.gai_keys and are opened only on the server.

-- Every key and setting the app knows about. Rebuilt on each run so older installs pick up new ones.
alter table private.gai_keys drop constraint if exists gai_keys_provider_check;
alter table private.gai_keys add constraint gai_keys_provider_check
  check (provider in ('perplexity', 'elevenlabs', 'whatsapp', 'whatsapp_secret', 'openrouter', 'github', 'vercel'));

alter table public.gai_settings drop constraint if exists gai_settings_key_check;
alter table public.gai_settings add constraint gai_settings_key_check check (key in ('model', 'help_url', 'welcome', 'wa_phone_id', 'wa_waba_id', 'wa_number', 'wa_name', 'voice_id', 'voice_name', 'wa_voice', 'fos_access'));

create or replace function public.gai_admin_setting_set(p_key text, p_value text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need_admin();
begin
  if p_key not in ('model', 'help_url', 'welcome', 'wa_phone_id', 'wa_waba_id', 'wa_number', 'wa_name', 'voice_id', 'voice_name', 'wa_voice', 'fos_access') then raise exception 'Unknown setting' using errcode = '22023'; end if;
  if p_key = 'model' and coalesce(p_value, '') !~ '^[a-z0-9-]+/[a-z0-9.-]+$' then raise exception 'Unknown model' using errcode = '22023'; end if;
  if p_key in ('wa_phone_id', 'wa_waba_id', 'wa_number') and coalesce(p_value, '') !~ '^[0-9]{0,20}$' then raise exception 'Use digits only' using errcode = '22023'; end if;
  if p_key = 'voice_id' and coalesce(p_value, '') !~ '^[A-Za-z0-9]{0,40}$' then raise exception 'Unknown voice' using errcode = '22023'; end if;
  if p_key = 'wa_voice' and coalesce(p_value, '') not in ('', 'voice', 'off') then raise exception 'Unknown voice mode' using errcode = '22023'; end if;
  if p_key = 'fos_access' and coalesce(p_value, '') not in ('', 'admin') then raise exception 'Unknown access mode' using errcode = '22023'; end if;
  if coalesce(p_value, '') = '' then delete from public.gai_settings where key = p_key;
  else
    insert into public.gai_settings (key, value) values (p_key, left(p_value, 600))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
  return public.gai_admin_settings();
end $$;

create or replace function public.gai_admin_key_set(p_provider text, p_ciphertext text, p_last4 text default '') returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.gai_need_admin();
  if p_provider not in ('perplexity', 'elevenlabs', 'whatsapp', 'whatsapp_secret', 'openrouter', 'github', 'vercel') then raise exception 'Unknown provider' using errcode = '22023'; end if;
  if coalesce(p_ciphertext, '') = '' then delete from private.gai_keys where provider = p_provider;
  else
    insert into private.gai_keys (provider, ciphertext, last4) values (p_provider, p_ciphertext, left(coalesce(p_last4, ''), 4))
    on conflict (provider) do update set ciphertext = excluded.ciphertext, last4 = excluded.last4, updated_at = now();
  end if;
  return public.gai_admin_keys();
end $$;

-- Who may build: every approved member, or only the admin while it is being tested. The demo account can look, not build.
create or replace function private.gai_fos_need(p_build boolean default false) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need();
begin
  if p_build and private.gai_demo(v_uid) then raise exception 'The demo account can look around Funnel OS. Create your own account to build a funnel.' using errcode = '42501'; end if;
  if p_build and not private.gai_admin(v_uid) and coalesce((select value from public.gai_settings where key = 'fos_access'), '') = 'admin' then
    raise exception 'Funnel OS is open to the admin only right now. It opens for members soon.' using errcode = '42501';
  end if;
  return v_uid;
end $$;

-- ---------- funnels ----------
create table if not exists public.gai_funnels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New funnel' check (char_length(title) <= 160),
  funnel_type text not null default 'sales-page' check (funnel_type ~ '^[a-z-]{2,30}$'),
  status text not null default 'running' check (status in ('running', 'review', 'live', 'failed', 'paused')),
  step text not null default 'research',
  steps jsonb not null default '[]'::jsonb,
  quiz jsonb not null default '{}'::jsonb check (pg_column_size(quiz) < 120000),
  research jsonb,
  offer jsonb,
  copy jsonb,
  wireframe jsonb,
  brand jsonb,
  visuals jsonb,
  options jsonb not null default '[]'::jsonb,
  revisions jsonb not null default '[]'::jsonb,
  picked integer,
  repo jsonb,
  deploy jsonb,
  error jsonb,
  work jsonb not null default '{}'::jsonb,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gai_funnels_user on public.gai_funnels (user_id, updated_at desc);

-- One row per built file: option n, page path. The big HTML lives here so polling stays light.
create table if not exists public.gai_funnel_files (
  funnel_id uuid not null references public.gai_funnels(id) on delete cascade,
  opt integer not null check (opt between 0 and 6),
  path text not null check (path ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  content text not null check (char_length(content) <= 600000),
  updated_at timestamptz not null default now(),
  primary key (funnel_id, opt, path)
);

-- The member's own images (logo, photos, product shots) and the AI images made for a funnel.
create table if not exists public.gai_funnel_assets (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9][a-z0-9._-]{2,80}$'),
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')),
  role text not null default 'other' check (role in ('logo', 'me', 'product', 'other', 'ai')),
  label text,
  data text not null check (char_length(data) <= 4000000),
  created_at timestamptz not null default now(),
  primary key (user_id, name)
);

alter table public.gai_funnels enable row level security;
alter table public.gai_funnel_files enable row level security;
alter table public.gai_funnel_assets enable row level security;
revoke all on public.gai_funnels, public.gai_funnel_files, public.gai_funnel_assets from public, anon, authenticated;

-- What the browser sees: everything except the server's working notes.
create or replace function private.gai_funnel_out(f public.gai_funnels) returns jsonb language sql stable security definer set search_path = '' as $$
  select (to_jsonb(f) - 'work' - 'user_id' - 'lease_until') || jsonb_build_object('busy', coalesce(f.lease_until > now(), false));
$$;

create or replace function public.gai_funnels_list() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'funnel_type', f.funnel_type, 'status', f.status, 'step', f.step,
    'template', f.quiz->>'template', 'options', (select coalesce(jsonb_agg(jsonb_build_object('n', o->'n', 'url', o->'url')), '[]'::jsonb) from jsonb_array_elements(f.options) o),
    'live', f.deploy->>'url', 'updated_at', f.updated_at) order by f.updated_at desc)
    from public.gai_funnels f where f.user_id = v_uid), '[]'::jsonb);
end $$;

create or replace function public.gai_funnel_get(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need(); f public.gai_funnels;
begin
  select * into f from public.gai_funnels where id = p_id and user_id = v_uid;
  if not found then raise exception 'That funnel was not found' using errcode = '22023'; end if;
  return private.gai_funnel_out(f);
end $$;

create or replace function public.gai_funnel_create(p_title text, p_type text, p_quiz jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need(true); f public.gai_funnels;
begin
  if (select count(*) from public.gai_funnels where user_id = v_uid and status = 'running') >= 2 then
    raise exception 'Two funnels are already being built. Wait for one to reach its preview links, then start the next.' using errcode = '22023';
  end if;
  insert into public.gai_funnels (user_id, title, funnel_type, quiz, steps)
  values (v_uid, left(coalesce(nullif(trim(p_title), ''), 'New funnel'), 160), p_type, coalesce(p_quiz, '{}'::jsonb), '[]'::jsonb)
  returning * into f;
  return private.gai_funnel_out(f);
end $$;

-- The server takes a short lease so two tabs never build the same funnel at once. Returns the full row, work included.
create or replace function public.gai_funnel_claim(p_id uuid, p_secs integer default 290) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need(); f public.gai_funnels;
begin
  update public.gai_funnels set lease_until = now() + make_interval(secs => least(greatest(p_secs, 10), 300))
  where id = p_id and user_id = v_uid and (lease_until is null or lease_until < now())
  returning * into f;
  if not found then return null; end if;
  return to_jsonb(f) - 'user_id';
end $$;

-- Saves the columns the pipeline changes. Keys left out stay as they are.
create or replace function public.gai_funnel_save(p_id uuid, p_patch jsonb, p_release boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need(); f public.gai_funnels; p jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  update public.gai_funnels set
    title = case when p ? 'title' then left(coalesce(p->>'title', title), 160) else title end,
    status = case when p ? 'status' then p->>'status' else status end,
    step = case when p ? 'step' then p->>'step' else step end,
    steps = case when p ? 'steps' then p->'steps' else steps end,
    quiz = case when p ? 'quiz' then p->'quiz' else quiz end,
    research = case when p ? 'research' then p->'research' else research end,
    offer = case when p ? 'offer' then p->'offer' else offer end,
    copy = case when p ? 'copy' then p->'copy' else copy end,
    wireframe = case when p ? 'wireframe' then p->'wireframe' else wireframe end,
    brand = case when p ? 'brand' then p->'brand' else brand end,
    visuals = case when p ? 'visuals' then p->'visuals' else visuals end,
    options = case when p ? 'options' then p->'options' else options end,
    revisions = case when p ? 'revisions' then p->'revisions' else revisions end,
    picked = case when p ? 'picked' then (p->>'picked')::integer else picked end,
    repo = case when p ? 'repo' then p->'repo' else repo end,
    deploy = case when p ? 'deploy' then p->'deploy' else deploy end,
    error = case when p ? 'error' then p->'error' else error end,
    work = case when p ? 'work' then p->'work' else work end,
    lease_until = case when p_release then null else lease_until end,
    updated_at = now()
  where id = p_id and user_id = v_uid
  returning * into f;
  if not found then raise exception 'That funnel was not found' using errcode = '22023'; end if;
  return private.gai_funnel_out(f);
end $$;

create or replace function public.gai_funnel_delete(p_id uuid) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  delete from public.gai_funnels where id = p_id and user_id = v_uid;
  return found;
end $$;

create or replace function public.gai_funnel_file_put(p_id uuid, p_opt integer, p_path text, p_content text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  if not exists (select 1 from public.gai_funnels where id = p_id and user_id = v_uid) then raise exception 'That funnel was not found' using errcode = '22023'; end if;
  insert into public.gai_funnel_files (funnel_id, opt, path, content) values (p_id, p_opt, p_path, p_content)
  on conflict (funnel_id, opt, path) do update set content = excluded.content, updated_at = now();
  return true;
end $$;

create or replace function public.gai_funnel_files_get(p_id uuid, p_opt integer default null) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  if not exists (select 1 from public.gai_funnels where id = p_id and user_id = v_uid) then raise exception 'That funnel was not found' using errcode = '22023'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('opt', opt, 'path', path, 'content', content) order by opt, path)
    from public.gai_funnel_files where funnel_id = p_id and (p_opt is null or opt = p_opt)), '[]'::jsonb);
end $$;

-- ---------- images ----------
create or replace function public.gai_asset_put(p_name text, p_mime text, p_role text, p_label text, p_data text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need(true);
begin
  if (select count(*) from public.gai_funnel_assets where user_id = v_uid and role <> 'ai') >= 60 and p_role <> 'ai' then
    raise exception 'You have 60 images saved. Remove a few in Funnel OS, Your images, then upload again.' using errcode = '22023';
  end if;
  insert into public.gai_funnel_assets (user_id, name, mime, role, label, data) values (v_uid, p_name, p_mime, coalesce(p_role, 'other'), left(p_label, 120), p_data)
  on conflict (user_id, name) do update set mime = excluded.mime, role = excluded.role, label = excluded.label, data = excluded.data;
  return jsonb_build_object('name', p_name, 'mime', p_mime, 'role', p_role, 'label', p_label);
end $$;

create or replace function public.gai_assets_list() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('name', name, 'mime', mime, 'role', role, 'label', label, 'size', char_length(data)) order by created_at desc)
    from public.gai_funnel_assets where user_id = v_uid and role <> 'ai'), '[]'::jsonb);
end $$;

create or replace function public.gai_assets_get(p_names text[]) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  return coalesce((select jsonb_agg(jsonb_build_object('name', name, 'mime', mime, 'role', role, 'label', label, 'data', data))
    from public.gai_funnel_assets where user_id = v_uid and name = any(p_names)), '[]'::jsonb);
end $$;

create or replace function public.gai_asset_delete(p_name text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := private.gai_fos_need();
begin
  delete from public.gai_funnel_assets where user_id = v_uid and name = p_name;
  return found;
end $$;

-- The keys a build needs, still sealed. Only the server can open them.
create or replace function public.gai_funnel_keys() returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.gai_fos_need(true);
  return coalesce((select jsonb_object_agg(provider, ciphertext) from private.gai_keys where provider in ('perplexity', 'openrouter', 'github', 'vercel')), '{}'::jsonb)
    || jsonb_build_object('model', (select nullif(value, '') from public.gai_settings where key = 'model'));
end $$;

-- What a member needs to know before starting: is Funnel OS ready, and can they build.
create or replace function public.gai_funnel_status() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := private.gai_need(); v_admin boolean := private.gai_admin(v_uid);
begin
  return jsonb_build_object(
    'ai', exists (select 1 from private.gai_keys where provider = 'perplexity'),
    'host', exists (select 1 from private.gai_keys where provider = 'vercel'),
    'github', exists (select 1 from private.gai_keys where provider = 'github'),
    'images', exists (select 1 from private.gai_keys where provider = 'openrouter'),
    'admin', v_admin, 'demo', private.gai_demo(v_uid),
    'open', v_admin or coalesce((select value from public.gai_settings where key = 'fos_access'), '') <> 'admin');
end $$;


-- ====================================================================================================
-- 7. Font uploads for funnels
-- ====================================================================================================
-- Members can upload their own font files (woff2, woff, ttf, otf) next to their images.
alter table public.gai_funnel_assets drop constraint if exists gai_funnel_assets_mime_check;
alter table public.gai_funnel_assets add constraint gai_funnel_assets_mime_check
  check (mime in ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'font/woff2', 'font/woff', 'font/ttf', 'font/otf'));
alter table public.gai_funnel_assets drop constraint if exists gai_funnel_assets_role_check;
alter table public.gai_funnel_assets add constraint gai_funnel_assets_role_check
  check (role in ('logo', 'me', 'product', 'other', 'ai', 'font'));

-- ====================================================================================================
-- Who may call what. Members call through the app; anyone may sign up, open a password link or read the help link.
-- ====================================================================================================
revoke all on function private.gai_admin(uuid), private.gai_ok(uuid), private.gai_need(), private.gai_need_admin() from public, anon, authenticated;
revoke all on function public.gai_me(), public.gai_about_set(jsonb), public.gai_check(text), public.gai_threads_list(),
  public.gai_thread_get(uuid), public.gai_thread_delete(uuid), public.gai_save_turn(uuid, text, text, text, text, jsonb, jsonb, jsonb),
  public.gai_admin_members(), public.gai_admin_set(uuid, text), public.gai_admin_settings(), public.gai_admin_setting_set(text, text) from public, anon;
grant execute on function public.gai_me(), public.gai_about_set(jsonb), public.gai_check(text), public.gai_threads_list(),
  public.gai_thread_get(uuid), public.gai_thread_delete(uuid), public.gai_save_turn(uuid, text, text, text, text, jsonb, jsonb, jsonb),
  public.gai_admin_members(), public.gai_admin_set(uuid, text), public.gai_admin_settings(), public.gai_admin_setting_set(text, text) to authenticated;
revoke all on function public.gai_lookup(text, integer), public.gai_vault(), public.gai_owner_key(text), public.gai_admin_keys(), public.gai_admin_key_set(text, text, text) from public, anon;
grant execute on function public.gai_lookup(text, integer), public.gai_vault(), public.gai_owner_key(text), public.gai_admin_keys(), public.gai_admin_key_set(text, text, text) to authenticated;
revoke all on function private.gai_demo(uuid), private.gai_new_user(text, text, text, boolean), private.gai_issue_code(uuid, text), private.gai_demo_guard() from public, anon, authenticated;
revoke all on function public.gai_signup(text, text, text), public.gai_code_check(text), public.gai_set_password(text, text), public.gai_public(), public.gai_admin_reset_link(uuid) from public;
grant execute on function public.gai_signup(text, text, text), public.gai_code_check(text), public.gai_set_password(text, text), public.gai_public() to anon, authenticated;
grant execute on function public.gai_admin_reset_link(uuid) to authenticated;
revoke execute on function public.gai_admin_reset_link(uuid) from anon;
revoke all on function public.gai_admin_setting_set(text, text), public.gai_admin_key_set(text, text, text), public.gai_owner_key(text), public.gai_check(text) from public, anon;
grant execute on function public.gai_admin_setting_set(text, text), public.gai_admin_key_set(text, text, text), public.gai_owner_key(text), public.gai_check(text) to authenticated;
revoke all on function private.gai_wa_ok(text), private.gai_lookup_core(text, integer) from public, anon, authenticated;
revoke all on function public.gai_admin_setting_set(text, text), public.gai_admin_key_set(text, text, text), public.gai_admin_key_get(text), public.gai_admin_wa_server(text), public.gai_admin_wa(),
  public.gai_wa_me(), public.gai_wa_code(), public.gai_wa_unlink(), public.gai_lookup(text, integer) from public, anon;
grant execute on function public.gai_admin_setting_set(text, text), public.gai_admin_key_set(text, text, text), public.gai_admin_key_get(text), public.gai_admin_wa_server(text), public.gai_admin_wa(),
  public.gai_wa_me(), public.gai_wa_code(), public.gai_wa_unlink(), public.gai_lookup(text, integer) to authenticated;
-- The webhook calls these without a sign-in. Each one checks the server token first.
revoke all on function public.gai_wa_config(text), public.gai_wa_in(text, text, text, text), public.gai_wa_lookup(text, uuid, text, integer), public.gai_wa_save(text, uuid, text, text, text, jsonb) from public;
grant execute on function public.gai_wa_config(text), public.gai_wa_in(text, text, text, text), public.gai_wa_lookup(text, uuid, text, integer), public.gai_wa_save(text, uuid, text, text, text, jsonb) to anon, authenticated;
revoke all on function public.gai_funnels_list(), public.gai_funnel_get(uuid), public.gai_funnel_create(text, text, jsonb), public.gai_funnel_claim(uuid, integer),
  public.gai_funnel_save(uuid, jsonb, boolean), public.gai_funnel_delete(uuid), public.gai_funnel_file_put(uuid, integer, text, text), public.gai_funnel_files_get(uuid, integer),
  public.gai_asset_put(text, text, text, text, text), public.gai_assets_list(), public.gai_assets_get(text[]), public.gai_asset_delete(text), public.gai_funnel_keys(), public.gai_funnel_status() from public, anon;
grant execute on function public.gai_funnels_list(), public.gai_funnel_get(uuid), public.gai_funnel_create(text, text, jsonb), public.gai_funnel_claim(uuid, integer),
  public.gai_funnel_save(uuid, jsonb, boolean), public.gai_funnel_delete(uuid), public.gai_funnel_file_put(uuid, integer, text, text), public.gai_funnel_files_get(uuid, integer),
  public.gai_asset_put(text, text, text, text, text), public.gai_assets_list(), public.gai_assets_get(text[]), public.gai_asset_delete(text), public.gai_funnel_keys(), public.gai_funnel_status() to authenticated;
revoke all on function private.gai_fos_need(boolean), private.gai_funnel_out(public.gai_funnels) from public, anon, authenticated;

-- Tell the Data API about the new functions right away.
notify pgrst, 'reload schema';

commit;
