"""Production Django settings.

These extend base.py and are NOT for local development.
Start the application with:
  gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
"""

from .base import *  # noqa: F403

DEBUG = False

# ── HTTP security ──────────────────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000          # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True             # redirect all HTTP → HTTPS
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = "DENY"

# ── Static files (Whitenoise) ──────────────────────────────────────────────────
# WhiteNoiseMiddleware is already injected in base.py middleware.
# CompressedManifestStaticFilesStorage is already set in base.py.
# Run `python manage.py collectstatic` before starting gunicorn.
