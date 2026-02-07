# Google Maps API Key Setup Guide

This guide walks you through getting your Google Maps API key step-by-step.

## Prerequisites

- A Google account (Gmail account works)
- Access to a web browser

## Step-by-Step Instructions

### Step 1: Go to Google Cloud Console

1. Open your browser and go to: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Sign in with your Google account if prompted

### Step 2: Create or Select a Project

**Option A: Create a New Project (Recommended for GeoQuests)**

1. Click the project dropdown at the top of the page (it may say "Select a project" or show an existing project name)
2. Click **"NEW PROJECT"** button
3. Enter project details:
   - **Project name**: `GeoQuests` (or any name you prefer)
   - **Organization**: Leave as default (if you have one)
   - **Location**: Leave as default
4. Click **"CREATE"**
5. Wait a few seconds for the project to be created
6. Select the new project from the dropdown (it should auto-select, but verify)

**Option B: Use Existing Project**

1. Click the project dropdown
2. Select an existing project from the list

### Step 3: Enable Required APIs

You need to enable two APIs:

#### Enable Maps JavaScript API

1. In the search bar at the top, type: **"Maps JavaScript API"**
2. Click on **"Maps JavaScript API"** from the results
3. Click the **"ENABLE"** button
4. Wait for it to enable (usually takes a few seconds)

#### Enable Places API

1. In the search bar, type: **"Places API"**
2. Click on **"Places API"** (make sure it's the one by Google, not a third-party)
3. Click the **"ENABLE"** button
4. Wait for it to enable

**Note:** You can also enable APIs from the "APIs & Services" > "Library" menu:
1. Click the hamburger menu (☰) in the top left
2. Go to **"APIs & Services"** > **"Library"**
3. Search for each API and enable them

### Step 4: Create API Key

1. Click the hamburger menu (☰) in the top left
2. Go to **"APIs & Services"** > **"Credentials"**
3. Click **"+ CREATE CREDENTIALS"** at the top
4. Select **"API key"** from the dropdown
5. A popup will appear with your new API key
6. **IMPORTANT:** Copy the API key immediately (you'll see it only once clearly)
   - It will look like: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 5: (Optional but Recommended) Restrict the API Key

For security, you should restrict your API key. This prevents others from using it.

1. In the API key creation popup, click **"RESTRICT KEY"**
   - OR if you closed the popup, go to **"APIs & Services"** > **"Credentials"**, find your API key, and click on it

2. **Application restrictions:**
   - Select **"HTTP referrers (web sites)"**
   - Click **"ADD AN ITEM"**
   - Add these referrers (one per line):
     ```
     http://localhost:3000/*
     http://localhost:3000
     https://yourdomain.com/*
     https://*.yourdomain.com/*
     ```
   - Replace `yourdomain.com` with your actual domain when you deploy

3. **API restrictions:**
   - Select **"Restrict key"**
   - Check only these APIs:
     - ✅ **Maps JavaScript API**
     - ✅ **Places API**
   - Click **"SAVE"**

**Note:** For local development, you can skip restrictions initially, but add them before deploying to production.

### Step 6: Set Up Billing (Required for API Usage)

**Important:** Google Maps requires a billing account, but you get $200/month free credit.

1. Click the hamburger menu (☰)
2. Go to **"Billing"**
3. If you don't have a billing account:
   - Click **"LINK A BILLING ACCOUNT"**
   - Click **"CREATE BILLING ACCOUNT"**
   - Fill in your information:
     - Account name: `GeoQuests Billing` (or any name)
     - Country: Select your country
     - Currency: Select your currency
     - Check the terms checkbox
   - Click **"SUBMIT AND ENABLE BILLING"**
   - Add a payment method (credit card)
   - **Don't worry:** You get $200 free credit per month, and you can set up billing alerts

4. Link the billing account to your project:
   - If not auto-linked, go to project settings
   - Select your billing account

### Step 7: Set Up Billing Alerts (Recommended)

To avoid unexpected charges:

1. Go to **"Billing"** > **"Budgets & alerts"**
2. Click **"CREATE BUDGET"**
3. Set budget amount: `$10` (or any amount you're comfortable with)
4. Set up alerts at 50%, 90%, and 100% of budget
5. Add your email for notifications
6. Click **"CREATE BUDGET"**

### Step 8: Add API Key to Your Project

1. Open `frontend/.env.local` (create it if it doesn't exist)
2. Add your API key:
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Replace `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual API key
4. Save the file

**Important:** 
- Never commit `.env.local` to git (it should be in `.gitignore`)
- The key starts with `NEXT_PUBLIC_` so it's available in the browser
- Restart your Next.js dev server after adding the key

## Verification Checklist

- [ ] Created/selected a Google Cloud project
- [ ] Enabled "Maps JavaScript API"
- [ ] Enabled "Places API"
- [ ] Created an API key
- [ ] Copied the API key
- [ ] (Optional) Restricted the API key
- [ ] Set up billing account
- [ ] (Optional) Set up billing alerts
- [ ] Added API key to `frontend/.env.local`
- [ ] Restarted Next.js dev server

## Testing Your API Key

After adding the key, test it:

1. Start your dev server: `cd frontend && npm run dev`
2. Navigate to a page with the map
3. If the map loads, your API key is working! ✅
4. If you see an error, check:
   - API key is correct in `.env.local`
   - APIs are enabled in Google Cloud Console
   - Billing is set up
   - Dev server was restarted after adding the key

## Common Issues

### "This API project is not authorized to use this API"

**Solution:** Make sure you've enabled both "Maps JavaScript API" and "Places API" in the API Library.

### "RefererNotAllowedMapError"

**Solution:** Add your domain to the HTTP referrers in API key restrictions, or temporarily remove restrictions for local development.

### "BillingNotEnabledMapError"

**Solution:** Set up a billing account in Google Cloud Console (Step 6 above).

### Map doesn't load / Blank map

**Solutions:**
1. Check browser console for errors
2. Verify API key is in `.env.local` (not `.env`)
3. Make sure key starts with `NEXT_PUBLIC_`
4. Restart dev server
5. Check that APIs are enabled

## Cost Information

### Free Tier: $200/month credit
- **Map Loads**: ~28,000 per month free
- **Geocoding**: ~40,000 requests/month free
- **Places API**: ~17,000 requests/month free

### After Free Tier:
- **Map Loads**: $7 per 1,000 loads
- **Geocoding**: $5 per 1,000 requests
- **Places API**: $17 per 1,000 requests

**For most development/testing:** You'll stay within the free tier.

## Security Best Practices

1. ✅ **Restrict API key** to specific domains
2. ✅ **Restrict API key** to only needed APIs
3. ✅ **Never commit** API keys to git
4. ✅ **Use different keys** for development and production
5. ✅ **Set up billing alerts** to monitor usage
6. ✅ **Rotate keys** if they're accidentally exposed

## Next Steps

Once you have your API key:

1. ✅ Add it to `frontend/.env.local`
2. ✅ Install Google Maps library: `npm install @react-google-maps/api`
3. ✅ Replace `QuestMap.tsx` with the Google Maps version
4. ✅ Test the map loads correctly

See `google-maps-migration.md` for implementation details.

## Quick Reference

- **Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
- **API Library**: APIs & Services > Library
- **Credentials**: APIs & Services > Credentials
- **Billing**: Billing > Account Management
- **Maps JavaScript API Docs**: [https://developers.google.com/maps/documentation/javascript](https://developers.google.com/maps/documentation/javascript)
