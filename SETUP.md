# Set up Funnel OS

This guide takes you from this repository to your own live Funnel OS in about 45 minutes. You click through four websites and copy a few values between them. No coding needed.

Using Claude Code? Open your copy of the repository and type `/setup`. It walks you through the same steps and checks your work as you go. Using another AI tool, like Cursor, Codex or Gemini, ask it: "Read SETUP.md and walk me through it one step at a time."

## Before you start

Make these accounts. Each one has a free way to start.

| Account | What it does in Funnel OS | Sign up |
| --- | --- | --- |
| GitHub | Holds your copy of the code | [github.com/signup](https://github.com/signup) |
| Vercel | Puts the app online | [vercel.com/signup](https://vercel.com/signup) (sign up with GitHub) |
| Supabase | The database: members, chats, funnels and the coach library | [supabase.com/dashboard](https://supabase.com/dashboard) |
| Perplexity API | The AI behind the funnel builder and the coach | [console.perplexity.ai](https://console.perplexity.ai) |

### What it costs

- **Vercel**: the free Hobby plan is for personal and non-commercial use ([Vercel terms](https://vercel.com/legal/terms)). If you run Funnel OS for paying members or clients, use Pro at $20 a month ([Vercel pricing](https://vercel.com/pricing)). Both plans let a function run for up to 300 seconds, which is what the funnel builder needs ([Vercel function duration docs](https://vercel.com/docs/functions/configuring-functions/duration)).
- **Supabase**: the free plan works for trying it out, but a free project pauses after 7 days with little activity ([Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)). For members, use Pro at $25 a month ([Supabase pricing](https://supabase.com/pricing)).
- **Perplexity API**: pay as you go. You add credit in the console and every answer and funnel build uses a little of it. Turn on auto reload so the coach never stops mid month.
- **Optional extras**: OpenRouter for AI images, WhatsApp Business and ElevenLabs for voice notes. Each is pay as you go and you can add them later.

## Step 1: Make your own copy

1. Sign in to GitHub and open this repository.
2. Click **Use this template**, then **Create a new repository**.
3. Pick your account, name it (for example `funnel-os`) and choose **Private**.
4. Click **Create repository**.

Use the template button. A fork of a public repository stays public, and your copy holds your library and settings.

## Step 2: Create the database

1. In [Supabase](https://supabase.com/dashboard), click **New project**. Name it `funnel-os`, make a strong database password (save it in your password manager) and pick the region closest to your members.
2. Under the security options, keep the **Data API** on and keep the `public` schema exposed. Funnel OS talks to the database through it, and the setup file locks it down to exactly what the app needs.
3. Click **Create new project** and wait about a minute until it is ready.
4. Open **SQL Editor** in the left menu and click **New query**.
5. In your GitHub copy, open `supabase/setup.sql`, click the **Copy raw file** button, paste it into the SQL Editor and click **Run**. You should see "Success. No rows returned".
6. Do the same with `supabase/library.sql`. This loads the starter coach library: 17 frameworks and 100 core answers.

Want a one-click demo on your sign-in page? Run `supabase/optional/demo-account.sql` too. Read [Optional: a demo account](#optional-a-demo-account) first.

Now copy two values. Click **Connect** at the top of your project to see both. You also find the Project URL under **Integrations**, **Data API**, and the keys under **Project Settings**, **API Keys** ([Supabase Data API docs](https://supabase.com/docs/guides/api), [Supabase API keys docs](https://supabase.com/docs/guides/getting-started/api-keys)):

- **Project URL**, like `https://abcdefgh.supabase.co`
- **Publishable key**, which starts with `sb_publishable_`. Older projects call it the `anon` key, and that works too.

Never use the **secret** key or the `service_role` key. Funnel OS refuses to start with one and tells you to swap it.

## Step 3: Make your secret code

Funnel OS seals every API key you save (Perplexity, Vercel, GitHub and the rest) with a secret code that only your server knows. Make it once.

On a Mac or Linux, open Terminal and run:

```
openssl rand -base64 32
```

On Windows, open PowerShell and run:

```
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

Copy the line it prints, a mix of 44 letters, numbers and symbols ending in `=`. Save it in your password manager. If you change it later, every saved key stops working and you add them again in the app.

## Step 4: Put it online with Vercel

1. In [Vercel](https://vercel.com/new), click **Add New**, then **Project**, and import your GitHub copy.
2. Leave **Framework Preset** on **Other**. There is nothing to build.
3. Open **Environment Variables** and add these:

| Name | Value | Needed |
| --- | --- | --- |
| `SUPABASE_URL` | Your Project URL from step 2 | Yes |
| `SUPABASE_PUBLISHABLE_KEY` | Your publishable key from step 2 | Yes |
| `GAI_ENC_KEY` | Your secret code from step 3 | Yes |
| `COACH_NAME` | Your full name, like `Avery Cole`. The coach shows as "Avery AI" and speaks as you. Without it the coach is called "AI Coach". | Recommended |
| `COACH_BIO` | One line about you, like `a funnel builder for health coaches`. Default: `a funnel builder and marketing educator` | Recommended |
| `APP_URL` | Your app address, like `https://funnels.yourdomain.com`. Used in password links and WhatsApp replies. | Recommended |

4. Click **Deploy** and wait for it to finish, then open your new address.

Whenever you add or change an environment variable later, open **Deployments**, click the three dots on the latest one and choose **Redeploy**. Changes only apply to new deployments.

## Step 5: Create your admin account

1. Open your app and click **Create an account**.
2. Sign up with the email you want to use as the admin.

The first account that signs up becomes the admin, and it is approved straight away. Everyone after that waits for you to approve them in **Members and settings**.

No email setup is needed. Accounts are confirmed when they sign up, and a member who forgets their password asks you: open **Members and settings**, find them and click **Password link**. The link works once and expires after 7 days.

Signed up with the wrong email first? Run this in the Supabase SQL Editor with the email you want, then sign up with that email:

```sql
update private.gai_config set value = 'you@example.com' where key = 'admin_email';
```

Forgot your own admin password? Run this in the SQL Editor with your email:

```sql
select private.gai_issue_code((select id from auth.users where email = 'you@example.com'), 'reset');
```

It prints a code. Open `https://your-app-address/#set/THE-CODE` and choose a new password. The code works once and expires after 7 days.

## Step 6: Connect the AI

Open your menu, then **Members and settings**.

**What powers Funnel OS**

- **Perplexity key** (required): create one in the [Perplexity console](https://console.perplexity.ai), add credit in [billing](https://console.perplexity.ai/project/billing) and turn on auto reload. Paste the key and click **Check and save**. It is checked, sealed on the server and only the last 4 characters ever show again.
- **Model**: Claude Opus 5.5 is the default. You can pick GPT-6.1 Sol, Gemini 4 Carbon, Grok 4.7 or Claude Sonnet 5.5. If the model you pick is busy, Funnel OS falls back to another one on its own.
- **Help link**: where members go for help, like your community or support page.
- **Welcome line**: the first thing members read on the home screen.

**Funnel OS** (all optional, each one switches on a step of the funnel builder)

- **Vercel token**: live preview links for every funnel option. Create one at [Vercel tokens](https://vercel.com/account/settings/tokens). For a team account, add the Team ID from your team's **Settings**, **General**. Without it, previews show inside Funnel OS only.
- **GitHub token**: approved funnels are pushed to a private repository and the member is invited. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new) for all repositories with **Administration** and **Contents** set to read and write.
- **OpenRouter key**: AI images for the pages. Create one at [OpenRouter keys](https://openrouter.ai/settings/keys) and add credit. Without it, pages use CSS and SVG art.
- **Who can build**: all approved members, or only you while you test.

### Optional: WhatsApp and voice notes

Members can text the coach or send voice notes to your WhatsApp Business number and get answers back, in text or in a voice you pick. The steps are in the app under **WhatsApp and your voice**: you create a Business app in Meta for Developers, add a phone number, make a permanent token with the `whatsapp_business_messaging` and `whatsapp_business_management` permissions and paste the Phone number ID, WhatsApp Business Account ID and App secret. The app shows you the callback URL and verify token to paste back into Meta.

For replies in a custom voice, add an [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys) under **Your voice**.

## Optional: a demo account

`supabase/optional/demo-account.sql` adds a **Try the demo** button to your sign-in page. Visitors look around as Sam Rivera, who runs an example physio clinic, without making an account.

- The demo coach answers with your Perplexity key, so every demo question uses a little of your credit. Skip the demo if you do not want that.
- The demo cannot build funnels, connect WhatsApp or change its email or password.
- Chats started in the demo clear after 30 minutes.

To remove it later, run this in the SQL Editor:

```sql
delete from auth.users where email = 'demo@example.com';
```

## Optional: your own domain

In Vercel, open your project, then **Settings**, **Domains**, and add a domain like `funnels.yourdomain.com`. Follow the DNS steps Vercel shows. Then set `APP_URL` to the new address and redeploy.

## Check that it works

- [ ] The sign-in page opens on your address without a "Finish the setup" message.
- [ ] You signed up and see **Members and settings** in your menu.
- [ ] The Perplexity key shows "added, ending" and its last 4 characters.
- [ ] A question in any channel gets an answer from the coach.
- [ ] **New funnel** opens the quiz.
- [ ] A second test account shows up under **Waiting for approval**, and you can approve it.

## When something goes wrong

Every error in the app says what to do next and links to the place to do it. These are the common ones during setup.

| You see | What to do |
| --- | --- |
| "Funnel OS is not connected to its database yet" | Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel ([step 4](#step-4-put-it-online-with-vercel)), then redeploy. |
| "SUPABASE_PUBLISHABLE_KEY holds a secret key" | Replace it with the publishable key that starts with `sb_publishable_` ([step 2](#step-2-create-the-database)), then redeploy. |
| "Funnel OS is waiting for its database" | Run `supabase/setup.sql` in the SQL Editor ([step 2](#step-2-create-the-database)). If you already did, open **Integrations**, **Data API** in Supabase and check that the Data API is on and `public` is in **Exposed schemas**. |
| "Funnel OS is missing its server key" or "GAI_ENC_KEY is not valid" | Make the code in [step 3](#step-3-make-your-secret-code), add it as `GAI_ENC_KEY` in Vercel and redeploy. |
| Your own account waits for approval | Another account signed up first. Run the `admin_email` update in [step 5](#step-5-create-your-admin-account). |
| The coach does not answer | Check the Perplexity key and your credit in the [Perplexity console](https://console.perplexity.ai/project/billing), then save the key again in **Members and settings**. |
| Funnel previews only show inside the app | Add a Vercel token under **Funnel OS** in **Members and settings**. |
| The app stopped working after a quiet week | A free Supabase project pauses. Open it in the [Supabase dashboard](https://supabase.com/dashboard) and click **Resume project**. |
| A saved key stopped working after you changed `GAI_ENC_KEY` | Add each key again in **Members and settings**. |

Still stuck? Ask your AI tool: "Read SETUP.md and AGENTS.md, then help me fix this error:" and paste the exact message.

## Getting updates

When a new version of this template comes out, ask your AI tool to compare your copy with [github.com/gustensun/funnel-os-kit](https://github.com/gustensun/funnel-os-kit) and bring the changes over, keeping your library and your edits. Then run `supabase/setup.sql` again in the SQL Editor. It is safe to run again: it adds what is new and keeps your members, chats and funnels. If the library files changed, run `supabase/library.sql` again too.
