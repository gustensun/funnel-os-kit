# Third-party notices

Funnel OS uses work by other people. Each part below keeps its own license, and the Funnel OS license in [LICENSE](LICENSE) does not change that. Nothing made by others is copied into this repository: these parts load from their own sources when the app runs, or install from npm.

## Loaded when the app runs

| Part | How it loads | License |
| --- | --- | --- |
| [Supabase JavaScript client](https://github.com/supabase/supabase-js) 2.119.0 | jsDelivr, in `index.html` | MIT |
| [PDF.js](https://github.com/mozilla/pdf.js) 4.10.38 | jsDelivr, when a member adds a PDF to the funnel quiz | Apache-2.0 |
| [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | Google Fonts, in `index.html` | SIL Open Font License 1.1 |
| Fonts in built funnels | Google Fonts, picked for each brand | Each font's own license, mostly SIL Open Font License 1.1 |
| Template previews | The public Funnel OS template gallery at tpl-gallery-library.vercel.app | Covered by [LICENSE](LICENSE) |

## npm packages

| Package | Used for | License |
| --- | --- | --- |
| [@vercel/functions](https://www.npmjs.com/package/@vercel/functions) | Finishing work after a reply on Vercel | Apache-2.0 |
| [opentype.js](https://github.com/opentypejs/opentype.js) | Setting text in the brand fonts for funnel graphics | MIT |
| [sharp](https://github.com/lovell/sharp) | Resizing and converting images | Apache-2.0. Its prebuilt libvips binaries are LGPL-3.0-or-later |
| [node-html-parser](https://github.com/taoqf/node-html-parser) | `npm run templates` only | MIT |
| [pg](https://github.com/brianc/node-postgres) | Tests only | MIT |
| [Playwright](https://github.com/microsoft/playwright) | Tests only | Apache-2.0 |

Their dependencies, with versions and licenses, are listed in `package-lock.json` and `test/package-lock.json`.

## Services the app calls

Funnel OS calls these services with the accounts and keys you add. Each one has its own terms, which you agree to when you make the account.

- [Perplexity API](https://docs.perplexity.ai): every model call, web search and decision step
- [Supabase](https://supabase.com): the database and sign-in
- [Vercel](https://vercel.com): hosting the app and the live funnel previews
- [GitHub](https://github.com): repositories for approved funnels
- [OpenRouter](https://openrouter.ai): AI images
- [Microlink](https://microlink.io): screenshots of live previews for the quality check, and of pages a member links. It needs no account. When it is busy or over its free limit, the visual check is skipped.
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api): the WhatsApp line
- [ElevenLabs](https://elevenlabs.io): voice notes in a custom voice
