# Funnel OS

Funnel OS is a web app that builds funnels with an agentic workflow. A member saves a brand kit once and answers a short quiz. A chain of AI steps then researches the market, sharpens the offer, writes and reviews the copy, plans the wireframe, builds the brand, makes the graphics and designs every page. The member gets live previews to compare, asks for changes, then approves the one they want and can send it to a HighLevel AI Studio project to keep editing there.

It comes with an AI coach. Members ask it about funnels, offers, copy, content, clients, digital products and AI, by chat or voice, on the site or on WhatsApp. It answers from a starter library of frameworks that you can edit, extend or replace with your own.

This repository is the whole app. Copy it, hand it to your AI coding tool, make it yours and run it on your own accounts.

## What's inside

**The funnel builder**

- A brand kit in five tabs: Brand, Colors and fonts, Logos and images, Offers, and Proof and files. Every new funnel starts from it, so members never start over.
- A quiz for the funnel type, the template, the offer, the look and any images, files or links the member already has. It fills in from the brand kit, and the last step can save the answers back to it.
- Build steps that show their progress live: market research, product images, offer, copy, copy review, wireframe, branding, graphics, building, live previews, a quality check and review.
- A copy review that scores every section, rewrites the weak ones and picks the strongest of seven hero headlines, with a second model as the judge.
- A quality check that looks at full-page screenshots on desktop and phone, and measures what a picture hides: sideways scrolling, broken images, text out of its box, tiny text and small tap targets.
- Design options built from a library of 117 finished funnel templates, so every option starts from a real page structure.
- Live preview links on your Vercel account. At approval, a member can paste the GitHub repository of a HighLevel AI Studio project, and Funnel OS pushes the funnel there for [Git Sync](https://help.gohighlevel.com/support/solutions/articles/155000009214-how-to-use-git-sync-in-ai-studio) to pull in. Without one, the code goes to a private GitHub repository for the member.

**The AI coach**

- It sits in the sidebar under the brand kit, marked Bonus. New chat opens Ask anything, and the Ask button on a funnel opens the Funnels topic with the question ready. Eight topics shape the answers: Ask anything, Funnels, Offers, Content, Digital Products, AI Agents, Clients and Vibe Coding.
- Answers grounded in the library, with numbered sources, follow-up questions, file and screenshot review, and web search when a question needs current facts.
- Talk mode in the browser, plus WhatsApp text and voice notes if you connect a WhatsApp Business number.
- A privacy guard. The coach never shares the coach's personal life, revenue, profit, sales or accounting, even when someone asks it to ignore its rules.

**Members and admin**

- Sign-up with approval by hand, a one-click demo account and one-time password links.
- One admin page for members, keys and settings. Activity shows counts only, never what members ask.
- Every API key is checked with its provider, sealed on the server and never sent to the browser.

## The pieces

| Piece | What it does | Cost |
|---|---|---|
| Your copy of this code | The app, in a private GitHub repository you own | Free |
| [Vercel](https://vercel.com) | Runs the app at your web address | Free Hobby plan for personal use, Pro at $20 a month for a business |
| [Supabase](https://supabase.com) | Database and sign-in | Free to start, Pro at $25 a month |
| [Perplexity API](https://console.perplexity.ai) | The AI for the coach and the funnel builder, with Claude, GPT, Gemini or Grok as the model | Pay for what you use |
| Optional | OpenRouter for AI images, a Vercel token for live previews, a GitHub token for code delivery, WhatsApp and ElevenLabs | Pay for what you use |
| HighLevel AI Studio, optional | Where members keep editing a finished funnel. Each member brings their own account and a GitHub token for the push | Depends on their HighLevel plan |

[START-HERE.md](START-HERE.md) explains the order. [SETUP.md](SETUP.md) has every step with links.

## Hand it to your AI

Open this folder in Claude Code, Codex, Cursor, Gemini CLI or any coding agent. [AGENTS.md](AGENTS.md) tells it how the app fits together and which rules to keep. Things you can ask for:

- "Walk me through SETUP.md one step at a time and wait for me after each step."
- "Change the coach to my name and rewrite the starter library in my voice, using my notes in this folder."
- "Add a paid ads topic to the coach with four starter questions."
- "Change the colors and fonts to match my brand."

Claude Code users can type `/setup` for a guided setup.

## Make it yours

[CUSTOMIZE.md](CUSTOMIZE.md) covers the coach name, the look, the sidebar, the coach topics, the library and the funnel templates. [DESIGN.md](DESIGN.md) records the design system, so new screens match the old ones.

## Run the tests

The tests run the real API code against a local Postgres that stands in for Supabase, with stand-ins for every outside service, so they cost nothing and need no keys.

1. Install [Node.js](https://nodejs.org) 22 or newer and [PostgreSQL](https://www.postgresql.org/download/) 15 or newer.
2. Run `npm install` in this folder. Then open the `test` folder and run `npm install` and `npx playwright install chromium` there.
3. Run `npm run test:unit` for quick checks of the coach prompt and the privacy guard, and `npm run test:db` for the database tests.
4. Start the local server with `npm run test:server`, then in a second terminal run `npm run test:api` and `npm run test:ui`. Screenshots land in `test/shots`.
5. Run `npm run test:shots` to check the quality check's full-page screenshots in a real browser. On Linux it uses the Chromium build that runs on Vercel. On a Mac or Windows, run `npx @puppeteer/browsers install chrome-headless-shell@stable` first and set `FOS_CHROME` to the path it prints.
6. Before you push changes, run `python3 tools/check_repo.py`. It looks for keys, personal details, broken links and syntax errors.

The tests use your `PGHOST`, `PGPORT`, `PGUSER` and `PGPASSWORD` settings, with `localhost`, `5432` and `postgres` as defaults. They create and drop a database called `funnel_os_test`.

## License

You can run and change your copy for your own business and your clients. Keep it private and don't resell or republish it. [LICENSE](LICENSE) has the full terms, and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists the open source parts.
