# CPA Forge — Deploy Guide

## What you need
- Free account at github.com
- Free account at vercel.com
- Free account at console.groq.com
- Node.js installed on your PC (nodejs.org → LTS version)

---

## Step 1 — Get your free Groq API key
1. Go to console.groq.com and sign up (free, no credit card)
2. Click "API Keys" → "Create API Key"
3. Copy the key — it starts with `gsk_`

---

## Step 2 — Choose your app password
Pick any password you want. This is what you'll share with study partners.
Example: `cpaforge2025`

---

## Step 3 — Put the project on GitHub
1. Go to github.com → sign in → click "New repository"
2. Name it `cpa-forge` → click "Create repository"
3. Open Command Prompt on your PC and run:

```
cd Desktop
git clone https://github.com/YOUR_USERNAME/cpa-forge.git
```

4. Copy all the files from this folder INTO the cloned folder
5. Then run:

```
cd cpa-forge
git add .
git commit -m "Initial deploy"
git push
```

---

## Step 4 — Deploy on Vercel (free)
1. Go to vercel.com → sign up with your GitHub account
2. Click "Add New Project"
3. Select your `cpa-forge` repository → click "Import"
4. Under "Environment Variables" add TWO variables:
   - Name: `GROQ_API_KEY`  Value: your key from Step 1
   - Name: `APP_PASSWORD`  Value: your password from Step 2
5. Click "Deploy"

Vercel builds it automatically. In ~2 minutes you get a URL like:
`https://cpa-forge-yourusername.vercel.app`

---

## Step 5 — Install as iPhone app (you + study partners)
1. Open Safari on iPhone (must be Safari)
2. Go to your Vercel URL
3. Enter the password
4. Tap Share → Add to Home Screen → Add
5. Done — it's a full-screen app on your home screen

Share the URL + password with study partners and they do the same.

---

## Updating the app later
Make changes to files on your PC, then:
```
git add .
git commit -m "update"
git push
```
Vercel auto-redeploys in ~60 seconds.

---

## Change the password anytime
Go to Vercel → your project → Settings → Environment Variables
Update `APP_PASSWORD` → Redeploy.
