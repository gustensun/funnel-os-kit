# Make Funnel OS yours

Everything here is optional. Funnel OS works with the starter library and the default look. When you are ready to make it yours, hand this file to your AI tool and say what you want, like "Change the colors to my brand" or "Add my coaching call transcripts to the library."

## Your name on the coach

Set two environment variables in Vercel, then redeploy:

- `COACH_NAME`: your full name, like `Avery Cole`. The coach shows as "Avery AI", speaks as you in first person and the privacy guard also catches questions that use your name. Without it the coach is called "AI Coach".
- `COACH_BIO`: one line about you, like `a funnel builder for health coaches`. It tells the coach who it speaks for.

## Colors and font

The whole look lives at the top of `css/app.css`: one set of color variables for light mode and one for dark mode. Change those and every screen follows.

- `--ground`, `--surface` and `--side` are the backgrounds: the page, the main panel and the left sidebar.
- `--text`, `--muted` and `--faint` are the text colors, from strongest to softest.
- `--primary` and `--primary-ink` are the main buttons and the text on them.
- `--accent` and `--sage` are the small highlights.
- `--font` is the typeface. The default is Plus Jakarta Sans. To change it, swap the Google Fonts link in `index.html` and the name in `--font`.

Keep enough contrast between text and background in both modes. Ask your AI tool to check every pair against WCAG AA when you change them.

[DESIGN.md](DESIGN.md) describes the whole system: colors, type, corners, components and the rules behind them. Give it to your AI tool with any design change, and ask it to update DESIGN.md and `.impeccable/design.json` when the look changes.

The logo is the bolt mark in `favicon.svg` and the "Funnel OS" wordmark in `js/app.js`. Search for `wordmark` to find it.

## Coach channels

The channels in the sidebar, like Funnels, Offers and Content, live in `js/channels.js`. Each one has:

- `id`: a short name for the address bar, like `offers`
- `name` and `blurb`: what members see
- `focus`: what the coach focuses on in that channel
- `hint`: words that help the coach find the right library passages
- `starters`: four example questions shown on an empty chat

Add, remove or rename channels there. The browser and the server both read the same file.

## The coach library

The coach answers from the library: frameworks, coaching call transcripts and video transcripts, plus core answers to the questions members ask most. It all lives in the `library` folder and loads into your database as one file.

### Add a framework, a call or a video

Each source is one Markdown file in `library/docs`. Start it with a short block like this:

```
---
title: My offer framework
kind: doc
url: https://yourdomain.com/offer-framework
added: 2026-01-31
---
```

- `title`: required, and unique across the library. Members see it in the library list.
- `kind`: `doc` for a framework or notes, `recording` for a coaching call, `youtube` for a video. Default: `doc`.
- `url`: optional, starts with `https://`. Members open the original from the library list.
- `added`: optional, a date like `2026-01-31`.

For a `doc`, write it in plain Markdown. Each `##` section becomes its own passage, so give each idea its own heading.

For a `recording` or `youtube` transcript, start a line with a time like `[12:34]` whenever a new part starts. The sources under an answer then show the time, and a video link opens at that moment. In a coaching call, mark speakers like `Avery Cole: words`. Only your lines are kept, so members' words and names never reach the library. Build it with your name as it appears in the transcript:

```
COACH_NAME="Avery Cole" npm run library
```

On Windows PowerShell:

```
$env:COACH_NAME="Avery Cole"; npm run library
```

### Core answers

`library/playbook.json` holds the answers to the questions members ask most. The coach bases its reply on a core answer when a question matches. Each entry has:

- `position`: the order in the list
- `topic`: a short label, like `Offers`
- `question`: the question as a member would ask it
- `keywords`: extra words that help match similar questions
- `answer`: your answer, in your voice
- `sources`: the titles of the library files the answer comes from. Each one must match a `title` in `library/docs`.

### Load it into your database

1. Run `npm run library`. It checks every file, runs the privacy guard and writes `supabase/library.sql`.
2. Read what it prints. It lists every sentence it left out, so you can reword anything removed by mistake.
3. Open the Supabase SQL Editor, paste `supabase/library.sql` and click **Run**.

Running it again replaces what it loaded before and keeps everything else. To start fresh with only your own teaching, delete the starter files in `library/docs`, empty `library/playbook.json` to `[]` and build again.

## The privacy guard

`js/coach-guard.js` keeps the coach from sharing your private life or your numbers. It works in three places:

1. When the library builds, it leaves out sentences that look like income, revenue, family or private details.
2. Before any AI runs, it refuses questions about the coach's money or private life, and attempts to get around the rules.
3. After an answer is written, it removes any sentence that still reads like a private or financial claim.

Members can still get help with their own prices, revenue and goals. If the guard blocks a teaching sentence by mistake, reword the sentence in your library file. Keep the guard in place when you change the code.

## How the coach talks

The coach's instructions are in `api/_prompt.js`: tone, answer length, when to ask questions, web search and the privacy rules. Edit the wording to match how you coach. Keep the privacy rules as the fifth paragraph, because the voice and WhatsApp versions reuse it by position.

## Funnel templates

Funnel OS designs each funnel from a library of 117 templates in `api/_templates.json`. Each entry has an `id`, a `name`, a category in `cat`, a funnel type in `funnel`, a `live` address and its `pages`. Thumbnails are paths in the public template gallery, or a full `https://` address for your own.

To add your own template, put it online first, for example as its own Vercel project. Add an entry with its `live` address and pages, then run `npm run templates`. It copies the list to `js/fos-templates.js` for the template picker, then studies every template's structure and design and writes `api/_tpl_lib.json`, which the funnel builder uses to match templates to a funnel.

## Advanced settings

These environment variables are optional. Leave them unset unless you have a reason.

- `FOS_BUILDER`: the model that writes the funnel pages. Default: `anthropic/claude-opus-5-5`.
- `FOS_IMAGE_MODELS`: the OpenRouter image models to try, in order, separated by commas.

The full list, including test-only settings, is in `.env.example`.
