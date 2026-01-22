# Resend Email Setup Guide

## Overview

We use **Resend** for sending magic link emails. Resend offers:
- **Free tier**: 3,000 emails/month (perfect for MVP)
- **High deliverability**: 95-98% delivery rate
- **Simple API**: Easy integration
- **Custom domains**: Send from `noreply@geoquests.com` after verification

## Quick Start (Test Domain)

### 1. Sign Up for Resend
1. Go to [resend.com](https://resend.com)
2. Sign up (no credit card required for free tier)
3. Get your API key from the dashboard

### 2. Use Test Domain
```bash
# .env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@resend.dev  # Test domain (works immediately)
```

**Pros:**
- Works immediately (no setup)
- Free
- Good for development/testing

**Cons:**
- Shows `@resend.dev` (less professional)
- Not ideal for production

## Production Setup (Custom Domain)

### 1. Verify Your Domain

**Step 1: Add Domain in Resend**
1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter `geoquests.com`
4. Resend will provide DNS records to add

**Step 2: Add DNS Records**

Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.) and add these records:

**SPF Record:**
```
Type: TXT
Name: @ (or geoquests.com)
Value: v=spf1 include:resend.com ~all
TTL: 3600
```

**DKIM Record:**
```
Type: TXT
Name: resend._domainkey
Value: (provided by Resend - unique for your account)
TTL: 3600
```

**DMARC Record (Optional but Recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@geoquests.com
TTL: 3600
```

**Step 3: Wait for Verification**
- Usually takes 5-30 minutes
- Resend checks DNS records automatically
- Status changes to "Verified" when ready

### 2. Update Environment Variables

```bash
# .env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@geoquests.com  # Your domain!
```

### 3. Send Emails

```python
# app/services/email.py
from resend import Resend
from app.config import settings

resend = Resend(api_key=settings.RESEND_API_KEY)

async def send_magic_link_email(to_email: str, magic_link: str) -> None:
    """Send magic link email via Resend"""
    try:
        resend.emails.send({
            "from": settings.RESEND_FROM_EMAIL,  # noreply@geoquests.com
            "to": [to_email],
            "subject": "Sign in to GeoQuests",
            "html": f"""
                <html>
                  <body style="font-family: Arial, sans-serif;">
                    <h2>Sign in to GeoQuests</h2>
                    <p>Click the link below to sign in:</p>
                    <a href="{magic_link}" 
                       style="background-color: #4CAF50; color: white; 
                              padding: 10px 20px; text-decoration: none; 
                              border-radius: 5px; display: inline-block;">
                       Sign In
                    </a>
                    <p>This link expires in 15 minutes.</p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                  </body>
                </html>
            """
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
```

## Cost Breakdown

**Free Tier (Perfect for MVP):**
- 3,000 emails/month
- 100 emails/day limit
- Custom domain support
- **Cost: $0/month**

**When to Upgrade:**
- If you exceed 3,000 emails/month
- Pro Plan: $20/month for 50,000 emails
- Or switch to AWS SES (~$0.03/month for 1,000 emails)

## Benefits of Resend

1. **Zero Cost for MVP**: Free tier covers 3,000 emails/month
2. **High Deliverability**: 95-98% delivery rate
3. **Simple Setup**: Just API key, no SMTP configuration
4. **Custom Domains**: Professional `@geoquests.com` emails
5. **No Maintenance**: Resend handles infrastructure
6. **Analytics**: Track email delivery in dashboard

## Troubleshooting

### Emails Not Sending
- Check API key is correct
- Verify domain is verified (if using custom domain)
- Check Resend dashboard for errors
- Ensure email address is valid

### Emails Going to Spam
- Verify domain DNS records are correct
- Check SPF, DKIM, DMARC records
- Use custom domain (better than test domain)
- Avoid spam trigger words in subject/body

### Domain Verification Failing
- Double-check DNS records match exactly
- Wait 30 minutes for DNS propagation
- Check TTL values (should be 3600 or lower)
- Verify records in DNS checker tool

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Setup](https://resend.com/docs/dashboard/domains/introduction)
- [Resend Pricing](https://resend.com/pricing)
- [Resend API Reference](https://resend.com/docs/api-reference)
