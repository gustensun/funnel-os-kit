// Coach channels: one per coaching topic. Shared by the browser and the server. Add, remove or rename them here.
(function (root) {
  const CHANNELS = [
    { id: 'general', name: 'Ask anything', blurb: 'Any question about building your business.',
      focus: 'Any topic. Pick the frameworks that fit the question.',
      hint: 'business offer funnel content clients',
      starters: ['Where should I start if I want to build a one-person business?', 'What should I focus on this week to get my first sale?', 'Review my business idea and tell me what to fix first', 'How do I pick a niche I can win in?'] },
    { id: 'funnels', name: 'Funnels', blurb: 'Sales pages, opt-ins, VSLs, upsells and conversion.',
      focus: 'Funnels: sales pages, landing pages, opt-in pages, VSL and webinar funnels, order bumps and upsells, page structure section by section, conversion fixes.',
      hint: 'funnel sales page landing page conversion opt-in upsell vsl',
      starters: ['Which funnel should I build first for my offer?', 'Walk me through every section of a sales page', 'My landing page converts under 1%. What do I check first?', 'How do I add an order bump and upsell that people actually buy?'] },
    { id: 'offers', name: 'Offers', blurb: 'Offer creation, pricing, value stacks and guarantees.',
      focus: 'Offers: offer creation, positioning, pricing, value stacks, bonuses, guarantees, low ticket to high ticket ladders.',
      hint: 'offer pricing value stack bonus guarantee high ticket',
      starters: ['Help me turn what I know into an offer people want', 'How should I price my first offer?', 'Build a value stack for my program', 'What guarantee should I use without getting burned?'] },
    { id: 'content', name: 'Content', blurb: 'YouTube, hooks, posts and building an audience.',
      focus: 'Content: YouTube, short form, hooks, titles, content that sells, personal brand, turning viewers into buyers.',
      hint: 'content youtube video hook audience personal brand',
      starters: ['What content should I post to get clients, not just views?', 'Give me 10 hooks for my next video', 'How do I plan a week of content in one hour?', 'How do I turn my YouTube viewers into buyers?'] },
    { id: 'digital-products', name: 'Digital Products', blurb: 'Courses, templates, memberships and launches.',
      focus: 'Digital products: courses, templates, memberships, low ticket products, product ladders, launches.',
      hint: 'digital product course template membership launch low ticket',
      starters: ['What digital product should I make first?', 'Outline a course I can sell in 30 days', 'How do I launch to a small audience?', 'Should I sell a low ticket product or go straight to high ticket?'] },
    { id: 'ai-agents', name: 'AI Agents', blurb: 'AI agents, automations and prompts for your business.',
      focus: 'AI agents and automation: which tasks to hand to AI, agent design, prompts, workflows, selling AI services.',
      hint: 'ai agent automation prompt workflow',
      starters: ['Which parts of my business should I hand to AI first?', 'Help me design an AI agent for my lead follow up', 'Write me a better prompt for this task', 'How do I sell AI automations to local businesses?'] },
    { id: 'clients', name: 'Clients', blurb: 'Getting clients, outreach, DMs and closing.',
      focus: 'Clients: getting clients, outreach, DM selling, sales calls, objection handling, pricing services. You can role play a prospect when the member wants to practise.',
      hint: 'clients outreach dm sales call close objection',
      starters: ['How do I get my first 3 clients without ads?', 'Write a DM I can send to a cold prospect', 'Play a prospect who says it is too expensive so I can practise', 'How do I run a sales call that does not feel salesy?'] },
    { id: 'vibe-coding', name: 'Vibe Coding', blurb: 'Building apps and tools with AI, no code.',
      focus: 'Vibe coding: building apps, dashboards and micro tools with AI builders, prompting builders, scoping an MVP, selling what you build.',
      hint: 'vibe coding app build tool prompt mvp',
      starters: ['What app could I build this weekend that people would pay for?', 'Write the first prompt for my app idea', 'How do I scope an MVP so it does not take months?', 'How do I sell a tool I built to clients?'] },
  ];
  const byId = (id) => CHANNELS.find((c) => c.id === id) || CHANNELS[0];
  const api = { CHANNELS, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GaiChannels = api;
})(typeof window !== 'undefined' ? window : globalThis);
