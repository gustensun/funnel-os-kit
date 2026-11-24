# Working on Funnel OS

Instructions for AI coding tools (Claude Code, Codex, Cursor, Gemini and others). Read this before changing anything. People setting the app up for the first time should follow SETUP.md; people changing the look, the coach or the library should start with CUSTOMIZE.md.

## What it is

Funnel OS is a members app with two parts:

1. **The funnel builder**: a member saves a brand kit once and answers a quiz that starts from it. An agentic pipeline then researches the market, sharpens the offer, writes the copy, has a second model review it, plans the sections, picks a brand, makes the graphics and builds one to three page options. It puts them online as live previews, checks them with full-page screenshots and layout measurements, and waits for the member to approve one. The approved funnel is published to Vercel and pushed to GitHub: to the repository of the member's HighLevel AI Studio project when they paste one, otherwise to a private repository they get invited to.
2. **The AI coach**: a bonus under the brand kit in the sidebar. Chat in eight topics, voice calls and an optional WhatsApp line that answer from the coach library, the owner's frameworks and transcripts, with a privacy guard around the coach's personal details.

The owner pays for the AI. Every model call goes through the Perplexity key the admin saves in the app.

## How it is built

- **No build step.** `index.html`, `css/app.css` and the files in `js/` are served as they are. No framework, no bundler. The browser loads Supabase JS from jsDelivr and reads public settings from `/config.js`.
- **Server**: Vercel functions in `api/`, CommonJS, Node 22 or newer, since the screenshot packages need it. Files that start with an underscore are helpers, never endpoints.
  - `api/config.js`: public settings for the browser, served as `/config.js` through the rewrite in `vercel.json`. Only safe values: the Supabase URL, the publishable key, the coach's name and the setup guide link.
  - `api/app.js`: account, member business profile, conversations, the library and the admin screen.
  - `api/ask.js`: coach answers, streamed as newline-delimited JSON, plus short voice answers.
  - `api/funnel.js`: the funnel builder. It works in runs of up to five minutes and each run hands over to the next.
  - `api/wa.js`: the WhatsApp webhook.
  - `api/_lib.js` (shared helpers, sealing, errors, database calls), `api/_ai.js` (models), `api/_prompt.js` (coach instructions), `api/_fos.js` (the build pipeline), `api/_fos_packs.js` (the offer, copy and copy review rules the prompts carry), `api/_fos_schema.js` (the shapes the offer and copy steps must return), `api/_shot.js` (full-page screenshots and layout facts with Chromium), `api/_studio.js` (pushes to a HighLevel AI Studio repository), `api/_gfx.js` (graphics), `api/_collect.js` (reading pages a member links), `api/_library.js` (template matching), `api/_motion.js` (motion script for built pages), `api/_owner.js` (opens the saved keys), `api/_wa.js` (WhatsApp and ElevenLabs).
  - **Brand kit**: one per member, saved as a private file through `gai_asset_put` under the name in `KIT_FILE` (`api/_fos.js`). It never ships with a page. The `context` and `context-save` actions in `api/funnel.js` read and save it, and a new funnel can write its quiz answers back with `kit_sync`.
  - **AI Studio push**: the `repo-push` action in `api/funnel.js` calls `api/_studio.js`. The approval step in `js/funnel-os.js` runs it before `approve` when a repository is pasted, and the live funnel's **Send it to HighLevel AI Studio** box runs it again for updates. A member's GitHub token is used for that one push and never saved; the admin can use the saved GitHub key instead. TanStack Start projects get route files with their CSS in `public/funnel`, empty repositories get the static pages, and other apps get an error that says what to do.
- **Database**: Supabase Postgres, set up by `supabase/setup.sql`. Every table has row level security on and no grants, so the browser cannot read tables directly. The app reads and writes only through functions in the `public` schema, each one checking who is asking, with explicit `grant execute` lines at the end of the file. Internal helpers and settings live in the `private` schema. The server calls the database with the signed-in member's token and the publishable key, never with a secret key.
- **Saved keys** (Perplexity, Vercel, GitHub, OpenRouter, WhatsApp, ElevenLabs) are sealed on the server with AES-256-GCM using `GAI_ENC_KEY`, stored sealed and opened only in `api/_owner.js`. The browser only ever sees the last 4 characters.
- **Library**: `library/docs/*.md` and `library/playbook.json` build into `supabase/library.sql` with `npm run library`.
- **Templates**: `api/_templates.json` lists the templates, `npm run templates` copies the list to `js/fos-templates.js` and studies them into `api/_tpl_lib.json`.
- **Look**: `DESIGN.md` records the visual system (colors, type, corners, components and rules) and `.impeccable/design.json` carries the same system for design tools. Follow it for new screens and update both when the look changes.
- **Shared by browser and server**: `js/channels.js` and `js/coach-guard.js` run in both, so keep them free of browser-only and Node-only code outside their existing guards.
- **Screenshots**: `api/_shot.js` launches the Chromium build from `@sparticuz/chromium` inside `api/funnel.js`. `vercel.json` bundles its files with `includeFiles`; keep that line when you edit the file. Locally, `FOS_CHROME` points to a Chrome headless shell and `FOS_SHOT_MOCK=1` returns made-up tiles.

## Rules

1. **Keep the privacy guard.** `js/coach-guard.js` and the privacy paragraph in `api/_prompt.js` (the fifth paragraph, reused by position) stop the coach from sharing the coach's money or private life. Do not weaken them, skip them or add a way around them.
2. **No secrets in the browser.** Never add a secret to `api/config.js`, `index.html` or `js/`. Never use the Supabase secret or `service_role` key; `api/_lib.js` refuses one on purpose.
3. **Never commit secrets or personal data.** No `.env` files, API keys, tokens, real member data or real phone numbers. Use `example.com` emails and test numbers in examples and tests.
4. **Errors say what to do next.** Throw errors with `bad(message, code, fix)` from `api/_lib.js`, where the message says what happened and what to do, and `fix` is `{ label, href }` pointing at the place to fix it. Never show a bare "Something went wrong".
5. **Database changes go in `supabase/setup.sql`**, written so the file stays safe to run again: `create table if not exists`, `add column if not exists`, `create or replace function`, never a `drop` that loses data. It runs as one transaction. Every new public function gets a `grant execute` line for the roles that need it and a check of who is asking inside.
6. **Keep the library and templates generated.** Edit `library/` and run `npm run library`; edit `api/_templates.json` and run `npm run templates`. Do not hand-edit `supabase/library.sql`, `api/_tpl_lib.json` or `js/fos-templates.js`.
7. **Plain words in the interface.** Short sentences, no jargon, no em dashes, no exclamation points, no emojis. Light and dark mode both need to work, on desktop and phone.
8. **Keep the prompts tool neutral.** `api/_fos_packs.js` and the build prompts teach the thinking as plain rules. No names of people or businesses, and never tell the model to name a framework on a page.

## Testing

| Command | What it checks | Needs |
| --- | --- | --- |
| `npm run test:unit` | The coach prompt and the privacy guard, with and without `COACH_NAME` | Node 22+ |
| `npm run test:db` | `supabase/setup.sql` and `supabase/library.sql` on a local Postgres stand-in for Supabase: permissions, approval, isolation between members, re-running | Postgres 15+ and `psql` |
| `npm run test:server` | Starts a local copy of the app on port 5055 with stand-ins for Supabase, Perplexity, WhatsApp, ElevenLabs, Vercel, GitHub and OpenRouter | Postgres, and `npm install` in both the root and `test/` |
| `npm run test:api` | End to end against the local server: admin keys, the brand kit and quiz sync, a full funnel build to live previews with the copy review, approval with GitHub, pushes to AI Studio repositories, isolation between members and the WhatsApp line | The local server running |
| `npm run test:ui` | A browser pass over the main screens, the brand kit included, in light, dark and phone sizes, with screenshots in `test/shots` | The local server running, and Chromium for Playwright: `cd test && npx playwright install chromium` |
| `npm run test:shots` | The full-page screenshots and layout facts of the quality check, in a real browser | Linux, or `FOS_CHROME` set to a Chrome headless shell from `npx @puppeteer/browsers install chrome-headless-shell@stable` |

The database tests use the `PGHOST`, `PGPORT`, `PGUSER` and `PGPASSWORD` settings of your shell and create a database called `funnel_os_test`. Nothing in `test/` is deployed (see `.vercelignore`).

Before you commit, run `python3 tools/check_repo.py`. It checks that no secrets, private addresses or personal details went into the repository.
