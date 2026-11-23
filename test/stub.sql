-- Local stand-ins for the Supabase pieces the migrations rely on. Test only.
create schema if not exists private; create schema if not exists auth; create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;
do $$ begin create role anon; exception when others then null; end $$;
do $$ begin create role authenticated; exception when others then null; end $$;
grant usage on schema public, private, auth, extensions to anon, authenticated;
create table auth.users (instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text, email_confirmed_at timestamptz default now(), last_sign_in_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now(), confirmation_token text, recovery_token text,
  email_change_token_new text, email_change text, email_change_token_current text, phone_change text, phone_change_token text, reauthentication_token text);
create table auth.identities (id uuid primary key, user_id uuid references auth.users(id) on delete cascade, provider_id text, identity_data jsonb, provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'admin@x.test'), ('00000000-0000-0000-0000-00000000000b', 'member@x.test'), ('00000000-0000-0000-0000-00000000000c', 'other@x.test');
