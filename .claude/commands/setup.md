---
description: Walk through setting up Funnel OS, one step at a time
---

Guide me through SETUP.md in this repository, one step at a time. I may not be technical, so use plain words and short messages.

How to guide me:

1. Read SETUP.md and AGENTS.md first. Follow SETUP.md in order: before you start, then steps 1 to 6, then the checklist. Skip the optional parts unless I ask for them.
2. Give me one step at a time: what to click, what to copy and where to paste it. Wait until I say it is done before you move on.
3. Never ask me to paste a secret into this chat: no database password, no `GAI_ENC_KEY`, no Perplexity, Vercel, GitHub, OpenRouter, WhatsApp or ElevenLabs key. Those go straight into Vercel or the app. The Supabase Project URL and the publishable key are public, so I can share those.
4. For step 3, you can run `openssl rand -base64 32` (or the PowerShell line from SETUP.md on Windows) in my terminal. Tell me to copy the result into Vercel and my password manager, and do not repeat it back.
5. Check my work where you can, without secrets:
   - The Project URL looks like `https://<project>.supabase.co` and the key starts with `sb_publishable_` (or is the older `anon` key). If I paste a key that starts with `sb_secret_`, stop me and explain the difference.
   - After step 2, check the database is ready:
     `curl -s -X POST "<Project URL>/rest/v1/rpc/gai_public" -H "apikey: <publishable key>" -H "Content-Type: application/json" -d '{}'`
     A reply with `"setup": true` means `supabase/setup.sql` ran and nobody has signed up yet. An error that mentions `gai_public` means it has not run yet.
   - After step 4, run `curl -s https://<my app address>/config.js`. If it contains `"error"`, read me the message and help me fix it in Vercel, then remind me to redeploy.
6. If something fails, find the message in "When something goes wrong" in SETUP.md and walk me through the fix.
7. At the end, go through "Check that it works" with me and tell me what is done and what is left, like the optional WhatsApp line, the demo account or my own domain.

Do not change any code during setup. If I want to change the look, the coach or the library afterwards, point me to CUSTOMIZE.md.
