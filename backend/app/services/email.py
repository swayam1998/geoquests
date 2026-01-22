"""Email service for sending emails via Resend."""
import resend
from app.config import settings
from fastapi import HTTPException, status


async def send_magic_link_email(to_email: str, magic_link_url: str) -> None:
    """Send magic link email via Resend.
    
    Args:
        to_email: Recipient email address
        magic_link_url: Magic link URL to include in email
        
    Raises:
        HTTPException: If email sending fails
    """
    # Check if we're in development mode
    api_key = settings.RESEND_API_KEY or ""
    api_key_clean = api_key.strip()
    is_dev_mode = not api_key_clean or api_key_clean == "test-key"
    
    # Development mode: if RESEND_API_KEY is not set or is "test-key", just log
    if is_dev_mode:
        print(f"\n{'='*60}")
        print(f"🔗 MAGIC LINK (Development Mode - No Email Sent)")
        print(f"{'='*60}")
        print(f"To: {to_email}")
        print(f"Link: {magic_link_url}")
        print(f"\n💡 Copy the link above and open it in your browser to sign in.")
        print(f"{'='*60}\n")
        return
    
    try:
        # Set API key for Resend
        resend.api_key = settings.RESEND_API_KEY
        
        # Send email using Resend SDK
        params = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Sign in to GeoQuests",
            "html": f"""
                <html>
                  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333;">Sign in to GeoQuests</h2>
                    <p>Click the link below to sign in to your account:</p>
                    <a href="{magic_link_url}" 
                       style="background-color: #4CAF50; color: white; 
                              padding: 12px 24px; text-decoration: none; 
                              border-radius: 5px; display: inline-block; 
                              margin: 20px 0;">
                       Sign In
                    </a>
                    <p style="color: #666; font-size: 14px;">
                      This link expires in {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </body>
                </html>
            """
        }
        
        result = resend.Emails.send(params)
        
        # Resend returns a dict with 'id' on success or 'error' on failure
        if isinstance(result, dict):
            if 'id' in result:
                # Success - email sent
                pass
            elif 'error' in result:
                error_detail = result.get('error', {}).get('message', 'Unknown error')
                raise Exception(f"Resend API error: {error_detail}")
        else:
            # Result might be an object, check for id attribute
            if hasattr(result, 'id'):
                # Success
                pass
            elif hasattr(result, 'error'):
                error_detail = getattr(result, 'error', 'Unknown error')
                raise Exception(f"Resend API error: {error_detail}")
                
    except HTTPException:
        # Re-raise HTTPExceptions (like "RESEND_API_KEY is not configured")
        raise
    except ValueError as e:
        # Handle ValueError from Resend configuration
        error_msg = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resend configuration error: {error_msg}. For development, set RESEND_API_KEY=test-key in .env to log magic links to console instead of sending emails."
        )
    except Exception as e:
        error_msg = str(e)
        # Provide more helpful error messages
        if "RESEND_API_KEY" in error_msg or "api_key" in error_msg.lower() or "not configured" in error_msg.lower() or "ValueError" in str(type(e)):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="RESEND_API_KEY is not configured. For development, set RESEND_API_KEY=test-key in .env to log magic links to console instead of sending emails."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {error_msg}"
        )
