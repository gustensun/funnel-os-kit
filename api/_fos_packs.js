// Framework packs for Funnel OS: how a strong offer, sales copy and a copy review work, written as plain
// working rules. They go into the offer, copy and review prompts in full. Tool neutral, no names of people or
// businesses, and the model is told to use the thinking without naming any framework on the page.

const OFFER = `OFFER PLAYBOOK (use the thinking; never name these ideas on the page)
An offer is what they buy plus how it is presented. Shape it so a buyer can say yes to each of these:
I want this outcome. I have the problem now. This method solves it. I trust who is behind it. I see why I could not fix it alone. I see why this way is better. People like me got results (only with real proof). It is worth more than the price. I can fit it into my week. Waiting costs more than buying. I know the next step. I want it now.

Value comes from four levers. Raise the dream outcome and how believable it is. Cut the time to the first result and the effort it takes. Every part of the stack should move at least one lever.

Transformation, timeline, trust:
- Transformation: who it is for, the concrete before and after in the buyer's words, measurable when the facts allow (a number, a timeframe, a milestone).
- Timeline: a believable time to the first win and to the full result. Put a first win in the first days when the product allows it.
- Trust: the named method, real proof, the guarantee and the person or team behind it.

The method: name it from what the owner described, in plain words a buyer would repeat. Give it 3 to 5 steps, each a verb plus the result it produces.

The stack:
- Lead with the core deliverable. Name every item after its outcome, for example "Launch week email pack".
- Each item answers one real objection from the research. One or two lines: what it is, then what it does for them.
- Values are honest standalone prices a buyer could check against comparable products or services. Never inflate them.
- 3 to 6 items is the sweet spot. More reads as clutter.

Add a bonus only when it makes the result faster, easier or safer, or gives real access. A useful set: a quick start that gets the first win, an effort reducer (templates, scripts, done-for-you assets), and access (a community, office hours) when it is real. Order them by how much the buyer will want them.

Price and anchoring:
- Keep the owner's price. Show the value before the price. Anchor to the real alternatives: hiring someone, the cost of the problem, the hours it eats.
- The price point sets the funnel's job. Free: a lead magnet with one promise. Up to about 100: a low-ticket offer that pays for ads, with an order bump and upsells. 100 to 1,000: an automated sales page and order form. 1,000 to 10,000: a webinar, video or challenge that builds trust first. Above that: an application and a call.
- Payment plans only when given or clearly fitting. Never invent a discount or an original price.

Guarantee: match it to the price and the trust level. Unconditional for 14 to 30 days suits low and mid prices and cold traffic. Conditional (do the work, get the result or the money back) suits higher prices. When the owner gave a guarantee, keep it exactly. Name it and state it in one plain sentence.

Urgency only for real reasons: a cohort start date, limited seats for a stated reason, a launch bonus that ends on a date. Otherwise leave it empty.

The path after the first purchase: an order bump at checkout (small, closely related, an easy add at roughly a fifth to two fifths of the front price), a one-time upsell right after (the next logical step that makes the first purchase work faster), and a downsell (a lighter or cheaper version of the upsell).

The name says what they get and how fast: outcome plus timeframe or format. Generic names like "Success Program" or "Mastery Course" lose to specific ones.`;

const COPY = `COPY PLAYBOOK (use the thinking; never name these ideas on the page)
Start where the buyer is. Read their awareness from the research and the funnel type:
- Problem aware (most cold traffic): open with the problem in their words, then what staying stuck costs, then the method.
- Solution aware: lead with what makes this method different and why the usual fixes let them down.
- Product aware or warm (upsells, order pages, people who know the owner): lead with the offer, the deal, proof and the button.

The hero, the first screen:
- A pre-headline that names the exact audience ("For physios who run their own clinic"). Never "If you are looking to...".
- The headline: the main promise or the sharpest pain in 12 words or fewer, concrete enough to picture. Patterns that work: How to [outcome] without [biggest objection]. [Specific result] in [timeframe]. From [painful before] to [desired after]. What if [specific outcome] took [short time]? Stop [common mistake]. A common belief that is costing them, with the better way.
- A sub-headline that adds the how, the timeframe or removes the main objection ("even if you [common objection]").
- A button that is a verb plus what they get, low friction ("Get the templates", "Book a free 15-minute call"). A softer second option under it when it fits.

The body:
- Write to one person as "you". Turn features into benefits and benefits into meaning ("so you can...", "which means...").
- One idea per paragraph, one to three short sentences. Generous line breaks. Lists of three.
- Specific beats vague: real names, counts, prices, timeframes and places from the brief. A number only when it is real.
- Reuse the buyer phrases from the research word for word in the problem, desire and FAQ sections.
- Paint a concrete moment after the result (the Monday morning, the first sale, the run without pain).
- Right after a big claim, show how it works in 3 to 5 named steps.
- Bullets lead with the outcome, then the detail. Each bullet is a reason to buy.

A long page moves in this order: the problem, what it really costs to wait (honestly), the turn (a story or the method), the change (before and after, real proof only), the offer (name, what is included, value, price), the response (guarantee, a real reason to act now, the button).

Objections go where they come up:
- Relevance and difficulty before the offer: will this work for me, is it too hard.
- Cost and value right after the price: the anchor, the cost of the problem, payment options.
- Trust next to the guarantee: who is behind it, how it works, what happens if it does not work.
- Timing before the final button: why now, what waiting costs.
- The FAQ answers the rest in their words. The usual seven: too expensive, no time, not sure I trust it, too complicated, will not work for me, I will do it later, who are you.

Proof mixes whatever is real: the owner's results and credentials, customer quotes, numbers, and demonstrations of the product itself (screens, samples, a worked example). Never invent any of it.

Page by page:
- Opt-in: one promise, three bullets on what they get, a short form, one button.
- Order page: a tight summary, what is included, price, guarantee, the checkout slot, and an order bump card with one paragraph, one benefit and a checkbox.
- Upsell: confirm the purchase went through, why this next step makes it work faster, the price, a short stack, a yes button and a plain no-thanks link.
- Thank you: what just happened, the next two or three steps, and when to expect what.
- Registration for a webinar or challenge: what they will learn in three bullets, when it is, who runs it, the form.
- Application or booking: who it is for and who it is not for, what happens next, the form or calendar slot.

Weak and strong, the same offer (an example from another business, shown only for the pattern; never reuse its words or numbers):
- Weak: "Attention: If you're looking to get more customers for your business, then I have the perfect solution for you. Leveraging our proprietary lead-getting solution optimized to acquire inbound leads while you sleep." The audience is vague, the words are jargon, nothing can be pictured, and the button shouts.
- Strong: "Unlimited content and emails done for you, completely hands-off." Then: "Get 20 to 30 new clients every month without working harder. We handle the research, writing, editing and posting. You close the deals." The deliverable is clear, the outcome is specific, the how is plain, and the button is easy to say yes to ("Get a free 15-minute call").

Leave out: hype words (amazing, revolutionary, game-changing, unlock, skyrocket, supercharge, elevate, seamless, effortless, empower, harness), filler (in today's fast-paced world, at the end of the day, in order to), vague promises (transform your life, take it to the next level), lines built as "it is not X, it is Y", several rhetorical questions in a row, and urgency that is not real.`;

const CHIEF = `COPY REVIEW STANDARD
Score every section from 1 to 10. 9 or 10 is ready for paid traffic. 7 or 8 is solid with one weakness. 6 or lower gets rewritten.
- Clarity: one idea, plain words, a stranger gets it on one read.
- Specificity: concrete nouns, real names, counts, prices and timeframes from the brief. No vague claims.
- Buyer voice: uses the buyer phrases from the research and sounds like the owner talking to one person.
- Desire: the outcome is vivid and tied to what they care about (money, time, status, health, relationships).
- Belief: every claim is backed by the method, real proof, the guarantee or a demonstration. Nothing invented.
- Objections: answers the doubt a buyer has at that point of the page.
- Flow: follows from the section before and earns the next one, so the page reads as one argument.
- Action: the next step is obvious and the button is a verb plus what they get.

Rewrite whatever the score when a section has: invented proof or numbers, hype words, filler openers, vague promises, features without outcomes, lines built as "it is not X, it is Y", em dashes or exclamation points, the same point made twice, a headline over 12 words, or a hero that does not say what is sold, to whom and what to do next.

How to rewrite:
- Keep the section id, its p, every fact, price, name and number exactly as given, and the same fields.
- Make it shorter and more specific before you make it longer.
- Swap generic lines for specifics from the brief, the research and the offer.
- Never add proof, results, logos or numbers that are not in the facts.

Headline candidates for the hero of the main page: write 7, each 12 words or fewer, each from a different angle: outcome plus timeframe, the sharpest pain, the method, the exact persona, objection removal ("without ..."), a specific result only when it is real, and one curious line that stays concrete. Wrap one phrase of each in *asterisks* for the accent color. No questions a reader could answer with "no".`;

const JUDGE = `You judge sales copy for a cold buyer described in the research. Pick what makes that buyer more likely to keep reading and buy, while staying true to the facts.
For headlines: understood in three seconds, specific and believable, matches the offer's promise and the buyer's awareness, uses their words, no hype.
For each rewritten section: compare BEFORE and AFTER and keep the one that sells better. If AFTER adds anything that is not in the facts, keep BEFORE. If they are equal, keep AFTER when it is shorter.`;

const LOOK = `You are a senior conversion designer reviewing screenshots of a live funnel page, desktop and phone, top to bottom. The screenshots come in order as tiles; each tile says which sections it shows.
Find the worst problems a visitor would notice, most serious first:
- Broken: overlapping or cut-off text, text running off the screen, sideways scrolling on the phone, broken or missing images, empty boxes, buttons that wrap badly, unreadable contrast.
- Weak design: no clear focal point in the first screen, flat hierarchy where everything looks the same, walls of text, cramped or uneven spacing, sections that look like a template with stock filler, drawn stand-ins where real product images belong, inconsistent styles between sections.
- Conversion: the offer or the button not visible in the first screen, the price or guarantee hard to find, a call to action that blends in, proof far from the claims.
Only name what you can see in the screenshots. Point to the section by its id and say exactly what to change in the code (sizes, spacing, layout, colors, image use). Problems that only show on one device say so.`;

module.exports = { OFFER, COPY, CHIEF, JUDGE, LOOK };
