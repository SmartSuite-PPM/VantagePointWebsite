# Vantage Point Digital website

Static HTML site (no build step) with one Vercel serverless function for the contact form.

## Structure

```
index.html  about.html  services.html  case-studies.html  insights.html  contact.html
api/contact.js        Serverless endpoint: validates enquiries and emails them via Resend
test/contact.test.js  Checks for the endpoint (npm test)
vercel.json           Clean URLs, security headers, noindex (remove at launch)
.env.example          Environment variables the endpoint needs
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial Vantage Point Digital site"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Keep the repository private until launch.

## Deploy on Vercel

1. Vercel > Add New > Project > import the GitHub repo.
2. Framework preset: Other. Leave build command and output directory empty.
3. Add the environment variables below, then deploy.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | API key from resend.com |
| `CONTACT_TO_EMAIL` | Inbox that receives enquiries |
| `CONTACT_FROM_EMAIL` | Sender, e.g. `Vantage Point Digital <enquiries@vantagepointdigital.uk>` |

Until the domain is verified in Resend, use `onboarding@resend.dev` as the sender and your own Resend account email as the recipient for testing. Redeploy after changing variables.

## Local testing

```bash
npm install -g vercel
cp .env.example .env.local   # fill in real values
vercel dev
npm test                     # endpoint checks, no network needed
```

## Before launch

- Remove the `X-Robots-Tag` line from `vercel.json` so search engines can index the site.
- Replace the placeholder calendar, email and LinkedIn cards on `contact.html`.
- Confirm the footer legal wording once the new entity is registered.
- Verify vantagepointdigital.uk in Resend and switch the sender to that domain.
