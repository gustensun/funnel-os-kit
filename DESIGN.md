---
name: Funnel OS
description: Ivory paper workspace with forest green ink for building funnels and asking an AI coach, with a deep forest dark mode.
colors:
  forest-ink: "#0B2418"
  field-sage: "#668168"
  deep-sage: "#4E6A50"
  ivory-paper: "#FAF7EF"
  side-paper: "#F2EFE4"
  raised-paper: "#EDEADF"
  sage-wash: "#E5E9DD"
  moss: "#4F5A4D"
  lichen: "#61685C"
  pill-positive-ink: "#2F4A32"
  hairline-border: "rgba(11, 36, 24, 0.12)"
  hairline-rule: "rgba(11, 36, 24, 0.10)"
  hairline-control: "rgba(11, 36, 24, 0.22)"
  dot-grid: "rgba(11, 36, 24, 0.12)"
  scrim: "rgba(11, 36, 24, 0.38)"
  night-ground: "#0B1C13"
  night-surface: "#0E2218"
  night-side: "#091710"
  night-raised: "#13291E"
  night-active: "#183225"
  night-ink: "#FAF7EF"
  night-muted: "rgba(250, 247, 239, 0.78)"
  night-faint: "rgba(250, 247, 239, 0.64)"
  night-sage: "#B9C9B8"
  night-warning: "#E8DDBF"
  night-pill-positive-ink: "#C9D8C7"
  night-pill-warning-bg: "#2A2A1C"
  night-hairline-border: "rgba(250, 247, 239, 0.11)"
  night-hairline-control: "rgba(250, 247, 239, 0.22)"
  band-glow: "#17382A"
  band-field: "#0D2218"
  band-edge: "#08150E"
  band-signal: "#7AB88A"
  band-fault: "#E0866F"
typography:
  wordmark:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(40px, 4.8vw, 64px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(32px, 3.6vw, 46px)"
    fontWeight: 500
    lineHeight: 1.07
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    letterSpacing: "-0.035em"
  form-title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  section:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  reading:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  figure:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 500
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
rounded:
  sharp: "2px"
  control: "3px"
  frame: "4px"
  card: "10px"
  stage: "12px"
  tile: "14px"
  bubble: "20px"
  composer: "22px"
  full: "999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  card: "14px"
  md: "16px"
  lg: "24px"
  xl: "28px"
  split: "48px"
components:
  sidebar:
    backgroundColor: "{colors.side-paper}"
    width: "268px"
  topbar:
    backgroundColor: "{colors.ivory-paper}"
    height: "60px"
  button-primary:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.ivory-paper}"
    rounded: "{rounded.sharp}"
    padding: "0 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.raised-paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.raised-paper}"
  button-small:
    typography: "{typography.label}"
    padding: "0 11px"
    height: "32px"
  button-new:
    backgroundColor: "transparent"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
  button-send:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.ivory-paper}"
    rounded: "{rounded.full}"
    size: "36px"
  icon-button:
    textColor: "{colors.moss}"
    rounded: "{rounded.control}"
    size: "36px"
  nav-item:
    textColor: "{colors.moss}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
    height: "34px"
  nav-item-hover:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.forest-ink}"
  nav-item-active:
    backgroundColor: "{colors.sage-wash}"
    textColor: "{colors.forest-ink}"
  input-field:
    backgroundColor: "{colors.ivory-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  textarea:
    backgroundColor: "{colors.ivory-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  composer:
    backgroundColor: "{colors.ivory-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.composer}"
    padding: "10px 10px 8px 16px"
  chat-bubble:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.bubble}"
    padding: "10px 16px"
  chip:
    textColor: "{colors.moss}"
    rounded: "{rounded.full}"
    padding: "0 10px"
    height: "28px"
  status-pill:
    backgroundColor: "{colors.side-paper}"
    textColor: "{colors.moss}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "22px"
  status-pill-positive:
    backgroundColor: "{colors.sage-wash}"
    textColor: "{colors.pill-positive-ink}"
  tab:
    textColor: "{colors.moss}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 11px"
    height: "30px"
  tab-active:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.ivory-paper}"
  builder-card:
    backgroundColor: "{colors.ivory-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.card}"
    padding: "14px"
  builder-card-hover:
    backgroundColor: "{colors.raised-paper}"
  choice-tile:
    backgroundColor: "{colors.ivory-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.tile}"
    padding: "18px 18px 14px"
  notice:
    backgroundColor: "{colors.side-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  live-notice:
    backgroundColor: "{colors.sage-wash}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.card}"
    padding: "14px"
  demo-note:
    backgroundColor: "{colors.sage-wash}"
    textColor: "{colors.moss}"
    rounded: "{rounded.frame}"
    padding: "12px"
  dialog:
    backgroundColor: "{colors.ivory-paper}"
    textColor: "{colors.forest-ink}"
    rounded: "{rounded.frame}"
    width: "min(640px, calc(100vw - 32px))"
  auth-panel:
    backgroundColor: "{colors.forest-ink}"
    textColor: "{colors.ivory-paper}"
    padding: "40px 48px"
  build-stage:
    backgroundColor: "{colors.band-field}"
    textColor: "{colors.ivory-paper}"
    rounded: "{rounded.stage}"
    height: "clamp(400px, 38vw, 440px)"
---

# Design System: Funnel OS

## Overview

**Creative North Star: "The Ivory Workbench"**

Funnel OS looks like a tidy workbench on warm paper. Ivory pages carry forest green ink, two sages mark the small things, and the one dark object on the bench is the night band where a funnel gets built. The chrome stays quiet so the funnel, the copy and the coach's answers own the screen.

A fixed sidebar holds the builder, the brand kit and the coach, a 60px top bar names the page, and the work sits in a 740px reading column or a 1080px builder pane, which keeps the density calm and even. Depth comes from paper steps and 1px hairlines, so very little floats. State changes take 160ms on one ease curve, and the longer sequences stay inside the build band.

Dark mode keeps the same structure in deep forest with ivory ink and a pale sage accent. It follows the system setting until the person picks a theme with the moon button.

**Key Characteristics:**
- One typeface, Plus Jakarta Sans, with tight tracking on anything 22px and up.
- Four paper steps for depth: Ivory Paper, Side Paper, Raised Paper and Sage Wash.
- Nearly square chrome, softer builder cards, round conversation, pills for chips and secondary actions.
- Forest Ink carries all the weight; the sages mark small icons, list markers and states.
- Two night bands that stay deep forest in both themes.

## Colors

A warm, low chroma palette of ivory paper, forest ink and two sages, mirrored into deep forest for dark mode.

### Primary
- **Forest Ink** (#0B2418): text, primary buttons, the active tab, the running build step, focus outlines and error copy. It also fills the sign-in panel. Night Ink (#FAF7EF) takes this role in dark mode.

### Secondary
- **Field Sage** (#668168): the text selection highlight (34% mix), done step dots, drop zone icons and the halo on the running step.
- **Deep Sage** (#4E6A50): the plus on New funnel, the admin icon, list markers, citation text and positive states. Night Sage (#B9C9B8) covers both sages in dark mode.

### Tertiary
- **Band Signal** (#7AB88A): live status dots, done tiles and glows inside the night bands.
- **Band Fault** (#E0866F): the failed state inside the build core, the only warm alert color in the system.

### Neutral
- **Ivory Paper** (#FAF7EF): page ground, surfaces, inputs, dialogs and the ink on forest panels.
- **Side Paper** (#F2EFE4): the sidebar, notices and the neutral, warning and negative pills.
- **Raised Paper** (#EDEADF): hover fills, your chat bubble and code blocks.
- **Sage Wash** (#E5E9DD): the active nav row, source tiles, citation chips, positive pills, the live funnel notice and the demo note.
- **Moss** (#4F5A4D): secondary text, lead paragraphs and resting nav labels.
- **Lichen** (#61685C): captions, hints, placeholders and sidebar group labels.
- **Hairlines** (Forest Ink at 12%, 10% and 22%): borders, rules and control outlines.
- **Night steps** (#0B1C13, #0E2218, #091710, #13291E, #183225): ground, surface, sidebar, raised and active in dark mode, with ivory text at 78% and 64% for muted and faint copy.

### Named Rules
**The One Ink Rule.** Forest Ink is the only heavy color in the light theme. Primary buttons, the active tab, the running step and error text all use it, so weight always means the same thing.

**The Calm Error Rule.** Errors and warnings are ink on Side Paper inside a 1px control hairline, with a next step and a link to the fix. Red and amber stay out of the chrome. Band Fault appears only inside the build core.

**The Night Band Rule.** The build stage and the build core stay deep forest in light and dark mode. Glass, glow and Band Signal live there and nowhere else.

## Typography

**Display Font:** Plus Jakarta Sans (with ui-sans-serif, system-ui, Segoe UI and Arial)
**Body Font:** Plus Jakarta Sans
**Label/Mono Font:** ui-monospace, SFMono-Regular and Menlo for codes and copy fields

**Character:** A friendly geometric grotesque used at every size. Hierarchy comes from size, weights 500 and 600, and tight tracking on large type.

### Hierarchy
- **Display** (500, clamp(40px, 4.8vw, 64px), 1.04): the sign-in headline on the forest panel.
- **Headline** (500, clamp(32px, 3.6vw, 46px), 1.07): the greeting on an empty chat channel, 32px on phones.
- **Title** (600, 25px): page titles in the builder, such as My funnels.
- **Form Title** (600, 22px): sign in, create account and the approval screen.
- **Section** (600, 15px): builder section heads and the page name in the top bar.
- **Reading** (400, 16px, 1.7): the coach's answers, in the 740px column.
- **Body** (400, 14.5px, 1.6): interface text.
- **Label** (500, 13px): field labels, tabs and small buttons.
- **Caption** (400, 12px): hints, metadata and helper text, in Lichen.
- **Figure** (500, 34px, tabular numbers): stat values on the admin page.

### Named Rules
**The One Family Rule.** Plus Jakarta Sans sets the whole interface. To change it, edit the font variable at the top of css/app.css and the Google Fonts link in index.html.

**The Tight Large Type Rule.** Type at 22px and up tracks between -0.03em and -0.04em with line height between 1.04 and 1.2. Body text keeps normal tracking.

## Layout

The app shell is a 268px sidebar beside a fluid main column. The main column opens with a 60px top bar and a hairline under it.

- **Reading column:** 740px wide with 24px side padding (16px on phones) for chat and answers.
- **Builder pane:** up to 1080px wide with 28px top and 80px bottom padding. The font and color step of the quiz widens to 980px.
- **Rhythm:** 4px, 8px, 12px, 14px, 16px, 24px and 28px. The sign-in panel pads 40px by 48px.
- **Texture:** empty chat channels, the sign-in panel and the build stage carry a 22px dot grid.
- **Below 860px:** the sidebar becomes a drawer (up to 300px or 86% of the screen) over a scrim, dialogs become bottom sheets and the top bar drops its subtitle.
- **Below 760px:** the build step list folds to one column. Below 640px the build core compacts and hides its tile labels.

## Elevation & Depth

Depth comes from the four paper steps and 1px hairlines in Forest Ink at 10% to 22%, which keeps the system flat. Four things carry a shadow: the chat composer, a selected card, the running build step and the build core.

### Shadow Vocabulary
- **Composer lift** (`box-shadow: 0 1px 2px rgba(11,36,24,.04), 0 8px 24px -16px rgba(11,36,24,.25)`): the chat composer only.
- **Selection ring** (`box-shadow: 0 0 0 1px var(--text)`): a chosen funnel type, template, asset, font or palette, together with an ink border.
- **Step halo** (`box-shadow: 0 0 0 4px` Field Sage at 30%): the running step dot in the build step list.
- **Night band** (`box-shadow: 0 1px 0 rgba(255,255,255,.05) inset, 0 30px 70px -40px rgba(8,20,13,.7)`): the build core.

### Named Rules
**The Hairline Rule.** Cards, menus and dialogs separate with a 1px hairline and a paper step. A new shadow needs a job the four above do not cover.

## Shapes

Three corner families plus the pill. Chrome is nearly square: 2px for primary buttons, 3px for inputs, nav rows, icon buttons and notices, 4px for menus, dialogs and the demo note. The builder softens its working objects: 10px cards, 12px for the build stage and chat source tiles, 14px for quiz tiles and drop zones. Conversation is round: a 20px bubble for your message and a 22px composer. Pills (999px) are for chips, tabs, status pills and secondary buttons, and the send button inside the composer is a circle.

**The Corner Family Rule.** Take the corner from the object's family: chrome, builder card or conversation. Two families inside one component reads as a mistake.

## Components

### Buttons
Quiet, with Forest Ink reserved for the main action on each view.
- **Shape:** primary is nearly square (2px). Secondary and ghost are pills (999px).
- **Primary:** Forest Ink fill and Ivory Paper text, 40px tall with 14px side padding. On the sign-in form it runs full width at 42px.
- **Secondary:** transparent with a 1px control hairline and ink text. Hover fills Raised Paper.
- **Ghost:** no border. Hover fills Raised Paper.
- **Small:** 32px tall, 11px padding, 13px text.
- **States:** 160ms color transitions, a 0.98 press scale over 120ms, 0.9 opacity on primary hover, 45% opacity when disabled and a 2px ink focus outline with a 2px offset.
- **New funnel:** the sidebar button is 36px with 3px corners, a rule hairline and a Deep Sage plus icon.

### Chips
- **Chips:** 28px pills with a border hairline and 13px Moss text. On the forest panel they switch to ivory at 85% with a 20% ivory border.
- **Status pills:** 22px pills in 12px weight 500. Neutral and warning use Side Paper with Moss, negative uses Side Paper with Forest Ink, positive uses Sage Wash with deep green ink (#2F4A32).
- **Tabs:** 30px pills in 13px. The active tab is Forest Ink with Ivory Paper text.

### Cards / Containers
- **Builder cards:** 10px corners, a 1px border hairline, 10px to 14px padding and no shadow. Hover fills Raised Paper and darkens the border to the control hairline. A selected card takes an ink border and the selection ring.
- **Quiz tiles:** 14px corners on Ivory Paper with live type and color previews inside. Type tiles pad 18px.
- **Notices:** 3px corners, Side Paper, a 1px control hairline, 12px by 14px padding and ink text with a link to the fix.
- **Live notice:** 10px corners, Sage Wash and a 1px Deep Sage border, shown when a funnel is published.
- **Dialogs:** centered and up to 640px wide, with 4px corners, Ivory Paper and a border hairline. They fade in and settle upward over 200ms.

### Inputs / Fields
- **Style:** 40px tall, 3px corners, Ivory Paper, a 1px control hairline and 12px side padding. Labels sit above in 13px weight 500, hints below in 12px Lichen.
- **Focus:** the border turns Forest Ink over 160ms, and the caret is ink.
- **Textarea:** 76px minimum height, 9px by 12px padding and vertical resize.

### Navigation
- **Sidebar:** Side Paper, 268px wide, with a hairline on the right. Group labels are 12px Lichen in weight 500.
- **Rows:** 34px tall with 3px corners, Moss text and an 18px line icon. Hover fills Raised Paper with ink text. The active row uses Sage Wash, ink text and weight 500.
- **Groups:** New funnel and My funnels, then Brand kit with five numbered rows (01 to 05 in 11.5px Deep Sage tabular numbers), then the coach with a Bonus pill (10.5px uppercase Deep Sage on a 1px hairline) and Recent chats. A 12.5px Moss note under a group label says what the group is for.
- **Overflow:** the sidebar list fades out over its last 18px where it scrolls under the account area.
- **Mobile:** below 860px a menu button in the top bar slides the sidebar in over a scrim in 240ms.

### Brand kit
- **Head:** a 640px column with the lead and a save status on the right. On wide screens a hairline closes it, since the sidebar lists the tabs.
- **Save status:** 12.5px Moss text after a 7px dot. Positive means saved, a pulsing warning dot means saving (still when reduced motion is on), negative means it did not save, and Faint means the demo.
- **Phone tabs:** below 860px the five tabs show as a row of 30px pills that scrolls sideways, with soft edges.
- **Offer cards:** 12px corners and a border hairline, up to 640px wide, with the main offer picked by a radio in the card head.

### Approval and copy review
- **Copy review:** a 10px card with a border hairline above the copy tab. It gives the section count, the average score and the kept rewrites, with the hero headline candidates behind a disclosure.
- **AI Studio box:** the repository and token fields sit inside the approval card. On a live funnel the same fields open from a Send it to HighLevel AI Studio disclosure with 12px corners.

### Chat
- **Your message:** a 20px bubble in Raised Paper, right aligned and up to 560px wide.
- **Answers:** Reading type straight on the page with Deep Sage list markers and 5px citation chips in Sage Wash.
- **Composer:** 22px corners on Ivory Paper with a control hairline that turns ink on focus, the composer lift and a 36px circular ink send button.
- **Thinking:** a Moss label with a moving shine that holds still when reduced motion is on.

### Build Stage and Core
The signature component and the one night object on the bench. The build stage is a wide band (400px to 440px tall, 12px corners) with a radial deep forest field (#17382A at the center to #08150E at the edge), a masked 22px ivory dot grid, glass tiles for the quiz answers, an animated core and a browser window that assembles the page. The build core variant (320px to 420px tall, 20px corners) adds Band Signal status dots, Band Fault for a failed step and a two column step list underneath. Both stay night in light and dark mode. Under reduced motion they draw a single still frame, and the stage has a pause button.

## Do's and Don'ts

### Do:
- **Do** keep one primary action per view in Forest Ink with 2px corners.
- **Do** give every error a next step and a link to the place to fix it, inside a notice.
- **Do** use Deep Sage and Field Sage for icons, list markers, citations, done states and the selection highlight.
- **Do** take every color from the theme variables at the top of css/app.css so light and dark stay in step.
- **Do** keep state changes at 160ms on the shared ease curve (cubic-bezier(0.22, 1, 0.36, 1)) and honor reduced motion.

### Don't:
- **Don't** add drop shadows to cards, menus or dialogs.
- **Don't** draw a thick colored stripe on one side of a notice or card.
- **Don't** add a second typeface or a red and amber alert palette to the chrome.
- **Don't** round chrome controls past 4px or give pills square corners.
- **Don't** put small uppercase tracked labels above headings.
- **Don't** add glass blur, glow or color gradient fills to paper surfaces.
