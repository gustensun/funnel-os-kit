#!/bin/bash
# Behaviour tests for supabase/setup.sql against a local Postgres stand-in for Supabase (see test/stub.sql).
# Uses the PGHOST, PGPORT, PGUSER and PGPASSWORD settings of your shell. Defaults: localhost, 5432, postgres.
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
R="psql -q -v ON_ERROR_STOP=1"
$R -d postgres -c "drop database if exists funnel_os_test" -c "create database funnel_os_test" && $R -d funnel_os_test -f test/stub.sql && $R -d funnel_os_test -f supabase/setup.sql -f supabase/optional/demo-account.sql -f test/seed.sql -c "update private.gai_config set value = 'admin@x.test' where key = 'admin_email'; update auth.users set raw_user_meta_data = jsonb_build_object('full_name', split_part(email, '@', 1))" 2>/dev/null || { echo "migration failed"; exit 1; }
P="psql -d funnel_os_test -tA -q"
A=00000000-0000-0000-0000-00000000000a; B=00000000-0000-0000-0000-00000000000b; C=00000000-0000-0000-0000-00000000000c
as() { $P -c "set role authenticated; set test.uid='$1'; $2" 2>&1 | tr "\n" " " | sed "s/ *$//"; }
anon() { $P -c "set role anon; $1" 2>&1 | tr "\n" " " | sed "s/ *$//"; }
pass=0; fail=0; t() { if [ "$3" = "-v" ]; then if ! echo "$2" | grep -q -- "$4"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL $1: $2"; fi; return; fi; if echo "$2" | grep -q -- "$3"; then pass=$((pass+1)); else fail=$((fail+1)); echo "FAIL $1: $2"; fi; }
t "admin me approved" "$(as $A "select gai_me()->>'status'")" approved
t "member me pending" "$(as $B "select gai_me()->>'status'")" pending
t "pending check blocked" "$(as $B "select gai_check('ask')")" "waiting for approval"
t "anon cannot vault" "$(anon "select gai_vault()")" "permission denied"
t "pending cannot vault" "$(as $B "select gai_vault()")" "waiting for approval"
t "pending cannot lookup" "$(as $B "select gai_lookup('sales funnel')")" "waiting for approval"
t "no direct library read" "$(as $A "select count(*) from gai_lib_chunks")" "permission denied"
t "member cannot admin" "$(as $B "select gai_admin_members()")" "Only the admin"
t "no direct table read" "$(as $A "select count(*) from gai_members")" "permission denied"
t "anon cannot me" "$(anon "select gai_me()")" "permission denied"
t "admin sees pending" "$(as $A "select gai_admin_members()::text")" member@x.test
t "admin approves" "$(as $A "select gai_admin_set('$B','approved')->>'status'")" approved
t "admin cannot change self" "$(as $A "select gai_admin_set('$A','revoked')")" "own access"
t "member check works" "$(as $B "select gai_check('ask')->>'ok'")" true
t "lookup works" "$(as $B "select jsonb_array_length(gai_lookup('sales funnel offer')->'passages')")" 2
t "playbook hit" "$(as $B "select gai_lookup('price my offer')->'plays'->0->>'question'")" "price my offer"
t "vault lists sources" "$(as $B "select jsonb_array_length(gai_vault()->'sources')")" 2
t "vault has preview" "$(as $B "select gai_vault()->'sources'")" preview
t "vault hides doc url" "$(as $B "select gai_vault()::text")" -v docs.example
t "anon cannot check" "$(anon "select gai_check()")" "permission denied"
t "name from sign-up" "$(as $B "select gai_me()->>'name'")" member
TID=$(as $B "select gai_save_turn(null,'funnels','ask','How do I start a funnel?','Start with one offer [1].','[{\"n\":1}]','[\"What next?\"]')")
t "save creates thread" "$TID" "-"
t "thread listed with channel" "$(as $B "select gai_threads_list()::text")" '"channel": "funnels"'
t "follow-up same thread" "$(as $B "select gai_save_turn('$TID','funnels','ask','And then?','Then traffic.')")" "$TID"
t "thread has 4 messages" "$(as $B "select jsonb_array_length(gai_thread_get('$TID')->'messages')")" 4
t "other user cannot read" "$(as $C "select gai_me()" >/dev/null; as $C "select gai_thread_get('$TID')")" "waiting for approval"
as $A "select gai_admin_set('$C','approved')" >/dev/null
t "approved other still cannot read" "$(as $C "select gai_thread_get('$TID')")" "belongs to another"
t "other cannot delete" "$(as $C "select gai_thread_delete('$TID')")" f
t "bad channel falls back" "$(as $B "select (select channel from gai_threads where id = gai_save_turn(null,'Bad Channel!','ask','q','a'))" 2>&1)" "permission denied"
t "about saves known keys" "$(as $B "select gai_about_set('{\"business\":\"Coaching\",\"hack\":\"x\"}')::text")" '"business": "Coaching"'
t "about drops unknown" "$(as $B "select gai_about_set('{\"business\":\"Coaching\",\"hack\":\"x\"}')::text")" '^{"business": "Coaching"}$'
t "usage logged" "$(as $A "select gai_admin_members()->0")" asks_30d
t "setting saved" "$(as $A "select gai_admin_setting_set('help_url','https://community.example.com/x')->>'help_url'")" community.example.com
t "me shows help url" "$(as $B "select gai_me()->>'help_url'")" community.example.com
t "member cannot set setting" "$(as $B "select gai_admin_setting_set('model','openai/gpt-6.1-sol')")" "Only the admin"
t "member cannot set key" "$(as $B "select gai_admin_key_set('perplexity','v1.X','abcd')")" "Only the admin"
t "member cannot list keys" "$(as $B "select gai_admin_keys()")" "Only the admin"
t "admin sets key" "$(as $A "select gai_admin_key_set('perplexity','v1.CIPHER','wxyz')->'perplexity'->>'last4'")" wxyz
t "plain key rejected" "$(as $A "select gai_admin_key_set('perplexity','sk-plain','abcd')")" "check constraint"
t "bad provider rejected" "$(as $A "select gai_admin_key_set('claude','v1.X','abcd')")" "Unknown provider"
t "keys list hides cipher" "$(as $A "select gai_admin_keys()::text")" -v CIPHER
t "member reads sealed key" "$(as $B "select gai_owner_key('perplexity')->>'ciphertext'")" v1.CIPHER
t "missing key is null" "$(as $B "select coalesce(gai_owner_key('claude')::text,'none')")" none
t "anon cannot read key" "$(anon "select gai_owner_key('perplexity')")" "permission denied"
t "no direct key table" "$(as $A "select * from private.gai_keys")" "permission denied"
t "admin removes key" "$(as $A "select gai_admin_key_set('perplexity','')::text")" '^{}$'
as $A "select gai_admin_key_set('perplexity','v1.CIPHER','wxyz')" >/dev/null
t "revoke blocks" "$(as $A "select gai_admin_set('$B','revoked')" >/dev/null; as $B "select gai_check('ask')")" "waiting for approval"
t "unconfirmed admin email is not admin" "$($P -c "update auth.users set email_confirmed_at = null where id = '$A'" >/dev/null; as $A "select gai_admin_members()"; $P -c "update auth.users set email_confirmed_at = now() where id = '$A'" >/dev/null)" "Only the admin"
t "delete own thread" "$(as $A "select gai_admin_set('$B','approved')" >/dev/null; as $B "select gai_thread_delete('$TID')")" t
D=$($P -c "select id from auth.users where email='demo@example.com'")
t "demo exists approved" "$(as $D "select gai_me()->>'status'")" approved
t "demo flag" "$(as $D "select gai_me()->>'demo'")" true
t "demo not admin" "$(as $D "select gai_admin_members()")" "Only the admin"
t "demo about fixed" "$(as $D "select gai_about_set('{\"business\":\"Hack\"}')->>'business'")" "Northside"
t "demo password guarded" "$($P -c "update auth.users set encrypted_password='x', email='z@z.z' where id='$D'" >/dev/null; $P -c "select email, encrypted_password <> 'x' from auth.users where id='$D'")" "demo@example.com|t"
DT=$(as $D "select gai_save_turn(null,'offers','ask','Pinned q','Pinned a')"); $P -c "update gai_threads set pinned = true where id = '$DT'" >/dev/null
t "demo cannot delete pinned" "$(as $D "select gai_thread_delete('$DT')")" f
VT=$(as $D "select gai_save_turn(null,'offers','ask','Visitor q','Visitor a')"); $P -c "update gai_threads set updated_at = now() - interval '2 hours' where id = '$VT'" >/dev/null
as $D "select gai_save_turn(null,'offers','ask','Next visitor','a')" >/dev/null
t "old demo visitor chat cleared" "$($P -c "select count(*) from gai_threads where id = '$VT'")" "^0$"
t "pinned kept" "$($P -c "select count(*) from gai_threads where id = '$DT'")" "^1$"
t "signup works" "$(anon "select gai_signup('New@Person.test','password1','New Person')->>'ok'")" true
t "signup lowercases and confirms" "$($P -c "select email, email_confirmed_at is not null from auth.users where email='new@person.test'")" "new@person.test|t"
t "signup has identity" "$($P -c "select count(*) from auth.identities i join auth.users u on u.id=i.user_id where u.email='new@person.test'")" "^1$"
t "signup password hashed" "$($P -c "select encrypted_password = extensions.crypt('password1', encrypted_password) from auth.users where email='new@person.test'")" "^t$"
t "signup duplicate" "$(anon "select gai_signup('new@person.test','password1','X')")" "already has an account"
t "signup admin email taken" "$(anon "select gai_signup('ADMIN@x.test','password1','X')")" "already has an account"
t "signup demo email blocked" "$(anon "select gai_signup('demo@example.com','password1','X')")" "reserved"
t "signup short password" "$(anon "select gai_signup('a@b.test','short','X')")" "8 characters"
t "signup needs name" "$(anon "select gai_signup('a@b.test','password1','  ')")" "your name"
t "new signup pending" "$(as $($P -c "select id from auth.users where email='new@person.test'") "select gai_me()->>'status'")" pending
N=$($P -c "select id from auth.users where email='new@person.test'")
t "member cannot make reset link" "$(as $B "select gai_admin_reset_link('$N')")" "Only the admin"
t "no reset link for demo" "$(as $A "select gai_admin_reset_link('$D')")" "fixed password"
CODE=$(as $A "select gai_admin_reset_link('$N')")
t "code check shows email" "$(anon "select gai_code_check('$CODE')->>'email'")" new@person.test
t "bad code check" "$(anon "select gai_code_check('nope')->>'ok'")" false
t "set password short" "$(anon "select gai_set_password('$CODE','short')")" "8 characters"
t "set password works" "$(anon "select gai_set_password('$CODE','newpassword9')->>'email'")" new@person.test
t "new password stored" "$($P -c "select encrypted_password = extensions.crypt('newpassword9', encrypted_password) from auth.users where id='$N'")" "^t$"
t "code single use" "$(anon "select gai_set_password('$CODE','another999')")" "already used"
t "codes table hidden" "$(anon "select * from private.gai_codes")" "permission denied"
t "anon cannot new_user" "$(anon "select private.gai_new_user('x@y.z','password1','x',true)")" "permission denied"
t "public help" "$(anon "select gai_public()::text")" help_url
t "model saved" "$(as $A "select gai_admin_setting_set('model','anthropic/claude-opus-5-5')->>'model'")" claude-opus-5-5
t "bad model rejected" "$(as $A "select gai_admin_setting_set('model','drop table')")" "Unknown model"
t "unknown setting rejected" "$(as $A "select gai_admin_setting_set('bogus','x')")" "Unknown setting"
t "member sees model with key" "$(as $B "select gai_owner_key('perplexity')->'meta'->>'model'")" claude-opus-5-5
t "check still counts asks" "$(as $B "select gai_check('ask')->>'ok'")" true
# WhatsApp
TOK=servertoken123; H=$(echo -n $TOK | sha256sum | cut -d' ' -f1)
t "wa closed before setup" "$(anon "select gai_wa_in('$TOK','m0','447700900123','hi')")" "Not allowed"
t "member cannot set server" "$(as $B "select gai_admin_wa_server('$H')")" "Only the admin"
t "bad server hash" "$(as $A "select gai_admin_wa_server('xyz')")" "Bad token"
t "admin sets server" "$(as $A "select gai_admin_wa_server('$H')")" t
t "wrong token blocked" "$(anon "select gai_wa_in('nope','m0','447700900123','hi')")" "Not allowed"
t "empty token blocked" "$(anon "select gai_wa_config('')")" "Not allowed"
t "unknown number" "$(anon "select gai_wa_in('$TOK','m1','+44 7700 900123','hi')->>'status'")" none
t "duplicate message" "$(anon "select gai_wa_in('$TOK','m1','447700900123','hi')->>'dup'")" true
t "member wa off" "$(as $B "select gai_wa_me()->>'enabled'")" false
as $A "select gai_admin_key_set('whatsapp','v1.WATOKEN','abcd'), gai_admin_setting_set('wa_number','447700900999'), gai_admin_setting_set('wa_phone_id','1234567890')" >/dev/null
t "member wa on" "$(as $B "select gai_wa_me()->>'enabled'")" true
t "member owner key limited" "$(as $B "select coalesce(gai_owner_key('whatsapp')::text,'none')")" none
t "bad phone id rejected" "$(as $A "select gai_admin_setting_set('wa_phone_id','12ab')")" "digits only"
t "voice id saved" "$(as $A "select gai_admin_setting_set('voice_id','AbC123xyz')->>'voice_id'")" AbC123xyz
t "anon cannot code" "$(anon "select gai_wa_code()")" "permission denied"
t "demo cannot code" "$(as $D "select gai_wa_code()")" "demo account"
WC=$(as $B "select gai_wa_code()->>'code'")
t "code six digits" "$WC" "^[0-9]\{6\}$"
t "bad code" "$(anon "select gai_wa_in('$TOK','m2','447700900123','Connect 000000')->>'status'")" bad_code
t "code links" "$(anon "select gai_wa_in('$TOK','m3','447700900123','Connect $WC')->>'linked_now'")" true
t "code single use wa" "$(anon "select gai_wa_in('$TOK','m4','447700900555','Connect $WC')->>'status'")" bad_code
t "linked member status" "$(anon "select gai_wa_in('$TOK','m5','447700900123','How do I price?')->>'status'")" approved
t "linked name" "$(anon "select gai_wa_in('$TOK','m6','447700900123','hi')->>'name'")" member
t "member sees masked number" "$(as $B "select gai_wa_me()->>'linked'")" '+447\*\*\*\*\*\*\*23'
t "config needs token" "$(anon "select gai_wa_config('$TOK')->'keys'->>'whatsapp'")" v1.WATOKEN
t "lookup via wa" "$(anon "select jsonb_array_length(gai_wa_lookup('$TOK','$B','sales funnel offer')->'passages')")" 2
t "lookup other user blocked" "$(anon "select gai_wa_lookup('$TOK','$C','sales funnel')")" "Not allowed"
WT=$(anon "select gai_wa_save('$TOK','$B','How do I price?','Price from the outcome.','voice')")
t "wa save thread" "$(as $B "select gai_thread_get('$WT')->>'title'")" "WhatsApp: How do I price"
t "wa thread files" "$(as $B "select gai_thread_get('$WT')->'messages'->0->'files'->0->>'name'")" "Voice note on WhatsApp"
t "wa same thread" "$(anon "select gai_wa_save('$TOK','$B','And then?','Then test it.','text')")" "$WT"
t "wa history" "$(anon "select jsonb_array_length(gai_wa_in('$TOK','m7','447700900123','next')->'history')")" 4
t "wa save other blocked" "$(anon "select gai_wa_save('$TOK','$C','x','y')")" "Not allowed"
t "admin wa status" "$(as $A "select gai_admin_wa()->>'linked'")" 1
as $A "select gai_admin_set('$B','revoked')" >/dev/null
t "revoked on wa" "$(anon "select gai_wa_in('$TOK','m8','447700900123','hi')->>'status'")" revoked
t "revoked cannot save" "$(anon "select gai_wa_save('$TOK','$B','x','y')")" "Not allowed"
as $A "select gai_admin_set('$B','approved')" >/dev/null
for i in 1 2 3 4 5 6 7 8; do anon "select gai_wa_in('$TOK','x$i','447700900777','111111')" >/dev/null; done
t "guessing locked" "$(anon "select gai_wa_in('$TOK','x9','447700900777','$(as $B "select gai_wa_code()->>'code'")')->>'status'")" locked
t "unlink" "$(as $B "select gai_wa_unlink()")" t
t "unlinked number" "$(anon "select gai_wa_in('$TOK','m9','447700900123','hi')->>'status'")" none
t "wa tables hidden" "$(anon "select * from private.gai_wa_links")" "permission denied"
t "lookup still members only" "$(anon "select gai_lookup('sales')")" "permission denied"
# A new install: the first sign-up becomes the admin, nobody after that.
$P -c "update private.gai_config set value = '' where key = 'admin_email'" >/dev/null
t "new install flagged" "$(anon "select gai_public()->>'setup'")" true
t "public shows demo email" "$(anon "select gai_public()->>'demo'")" demo@example.com
t "first signup is admin" "$(anon "select gai_signup('Owner@New.test','password1','Owner')->>'admin'")" true
t "admin email claimed" "$($P -c "select value from private.gai_config where key = 'admin_email'")" "^owner@new.test$"
O=$($P -c "select id from auth.users where email='owner@new.test'")
t "first account is admin" "$(as $O "select gai_me()->>'admin'")" true
t "first account approved" "$(as $O "select gai_me()->>'status'")" approved
t "setup flag cleared" "$(anon "select gai_public()->>'setup'")" false
t "second signup not admin" "$(anon "select gai_signup('late@new.test','password1','Late')->>'admin'")" false
t "old admin lost admin" "$(as $A "select gai_admin_members()")" "Only the admin"
$P -c "update private.gai_config set value = 'admin@x.test' where key = 'admin_email'" >/dev/null
t "setup runs twice" "$(psql -d funnel_os_test -q -v ON_ERROR_STOP=1 -f supabase/setup.sql 2>&1 | grep -c ERROR)" "^0$"
t "data kept after rerun" "$(as $A "select gai_admin_keys()->'perplexity'->>'last4'")" wxyz
t "library loads" "$(psql -d funnel_os_test -q -v ON_ERROR_STOP=1 -f supabase/library.sql 2>&1 | grep -c ERROR)" "^0$"
t "library reloads" "$(psql -d funnel_os_test -q -v ON_ERROR_STOP=1 -f supabase/library.sql 2>&1 | grep -c ERROR)" "^0$"
t "library answers" "$(as $B "select gai_lookup('what is the funnel formula')->'plays'->0->>'question'")" "Funnel Formula"
t "library cites a doc" "$(as $B "select gai_lookup('what is the funnel formula')->'plays'->0->>'sources'")" "The Funnel Formula"
t "test library kept alongside" "$(as $B "select count(*) from jsonb_array_elements(gai_vault()->'sources')")" "^19$"
echo "passed $pass, failed $fail"
