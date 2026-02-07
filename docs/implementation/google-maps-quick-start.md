# Google Maps API Key - Quick Start

## 🚀 5-Minute Setup

### 1. Go to Google Cloud Console
👉 [https://console.cloud.google.com/](https://console.cloud.google.com/)

### 2. Create/Select Project
- Click project dropdown → "NEW PROJECT"
- Name: `GeoQuests`
- Click "CREATE"

### 3. Enable APIs
Search and enable:
- ✅ **Maps JavaScript API**
- ✅ **Places API**

### 4. Create API Key
- Go to: **APIs & Services** → **Credentials**
- Click: **"+ CREATE CREDENTIALS"** → **"API key"**
- **Copy the key immediately!**

### 5. Set Up Billing
- Go to: **Billing**
- Create billing account (credit card required)
- **Don't worry:** $200/month free credit included

### 6. Add to Project
Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

### 7. Restart Dev Server
```bash
cd frontend
npm run dev
```

## ✅ Test It

Open your app → If map loads, you're done! 🎉

## 📋 Full Guide

For detailed instructions, see: `google-maps-api-key-setup.md`

## 🔒 Security (Do This Before Production)

1. Go to **APIs & Services** → **Credentials**
2. Click your API key
3. Under "Application restrictions": Select **"HTTP referrers"**
4. Add your domains:
   ```
   http://localhost:3000/*
   https://yourdomain.com/*
   ```
5. Under "API restrictions": Select **"Restrict key"**
6. Check only: Maps JavaScript API, Places API
7. Click **"SAVE"**

## 💰 Cost

- **Free**: $200/month credit (~28,000 map loads)
- **After free tier**: $7 per 1,000 map loads
- **Recommendation**: Set up billing alerts

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| "API not authorized" | Enable Maps JavaScript API & Places API |
| "Billing not enabled" | Set up billing account |
| "RefererNotAllowed" | Add domain to API key restrictions |
| Map doesn't load | Check `.env.local`, restart server |

## 📚 Next Steps

1. ✅ Get API key (you're here!)
2. Install: `npm install @react-google-maps/api`
3. Replace `QuestMap.tsx` with Google Maps version
4. Test and enjoy! 🗺️
