"""Test configuration - overrides settings for testing.

This file sets up test environment variables so tests can run
without requiring a .env file with real API keys.
"""
import os

# Override settings for tests (no real API keys needed)
# All values must be strings (environment variables are always strings)
TEST_SETTINGS = {
    "DATABASE_URL": "sqlite:///:memory:",
    "SECRET_KEY": "test-secret-key-for-testing-only-not-for-production-min-32-chars",
    "ALGORITHM": "HS256",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "30",  # String, not int
    "REFRESH_TOKEN_EXPIRE_DAYS": "7",  # String, not int
    "GOOGLE_CLIENT_ID": "test-client-id",
    "GOOGLE_CLIENT_SECRET": "test-client-secret",
    "GOOGLE_REDIRECT_URI": "http://localhost:8000/auth/google/callback",
    "MAGIC_LINK_SECRET_KEY": "test-magic-link-secret-for-testing",
    "MAGIC_LINK_EXPIRE_MINUTES": "15",  # String, not int
    "FRONTEND_URL": "http://localhost:3000",
    "RESEND_API_KEY": "test-resend-key",  # Won't actually send emails
    "RESEND_FROM_EMAIL": "test@resend.dev",
}

# Set environment variables for tests (only if not already set)
# This allows tests to run without .env file
for key, value in TEST_SETTINGS.items():
    os.environ.setdefault(key, str(value))  # Only set if not already set
