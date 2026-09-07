from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse

from decouple import Csv, config


BASE_DIR = Path(__file__).resolve().parent.parent


def csv_config(name: str, default: str = '') -> list[str]:
    value = config(name, default=default, cast=Csv())
    return [item for item in value if item]


def database_config() -> dict:
    database_url = config('DATABASE_URL', default='').strip()
    if not database_url:
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }

    parsed = urlparse(database_url)
    if parsed.scheme not in {'postgres', 'postgresql'}:
        raise ValueError('DATABASE_URL must use postgres:// or postgresql://')

    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(parsed.path.lstrip('/')),
        'USER': unquote(parsed.username or ''),
        'PASSWORD': unquote(parsed.password or ''),
        'HOST': parsed.hostname or 'localhost',
        'PORT': parsed.port or 5432,
        'CONN_MAX_AGE': config('DB_CONN_MAX_AGE', default=60, cast=int),
        'OPTIONS': {'sslmode': config('DB_SSLMODE', default='prefer')},
    }


DEBUG = config('DEBUG', default=False, cast=bool)
SECRET_KEY = config('SECRET_KEY', default='')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-local-development-only'
    else:
        raise RuntimeError('SECRET_KEY is required when DEBUG=False')
if not DEBUG and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith('CHANGE_ME')):
    raise RuntimeError('SECRET_KEY must be a strong production secret with at least 50 characters')

ALLOWED_HOSTS = csv_config('ALLOWED_HOSTS', 'localhost,127.0.0.1' if DEBUG else '')
if not DEBUG and not ALLOWED_HOSTS:
    raise RuntimeError('ALLOWED_HOSTS is required when DEBUG=False')
if not DEBUG and '*' in ALLOWED_HOSTS:
    raise RuntimeError('Wildcard ALLOWED_HOSTS is not allowed in production')

CSRF_TRUSTED_ORIGINS = csv_config('CSRF_TRUSTED_ORIGINS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',
    'core',
    'users',
    'products',
    'orders',
    'payments',
    'reviews',
    'discounts',
    'notifications',
    'feeds',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
if not DEBUG and not config('DATABASE_URL', default='').strip():
    raise RuntimeError('DATABASE_URL is required when DEBUG=False')
DATABASES = {'default': database_config()}
AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fa-ir'
TIME_ZONE = 'Asia/Tehran'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = Path(config('STATIC_ROOT', default=str(BASE_DIR / 'staticfiles')))
MEDIA_URL = '/media/'
MEDIA_ROOT = Path(config('MEDIA_ROOT', default=str(BASE_DIR / 'media')))
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': config('API_PAGE_SIZE', default=12, cast=int),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('API_ANON_RATE', default='120/min'),
        'user': config('API_USER_RATE', default='600/min'),
        'auth': config('API_AUTH_RATE', default='10/min'),
        'otp': config('API_OTP_RATE', default='6/min'),
        'contact': config('API_CONTACT_RATE', default='5/min'),
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_MINUTES', default=30, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOWED_ORIGINS = csv_config(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173' if DEBUG else '',
)
CORS_ALLOW_CREDENTIALS = True

SPECTACULAR_SETTINGS = {
    'TITLE': 'N ONE Shop API',
    'DESCRIPTION': 'API فروشگاه اینترنتی ن وان',
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    # چهار مدل، فیلدی به نام status با مجموعه‌گزینه‌های متفاوت دارند؛ بدون این نگاشت
    # drf-spectacular نام‌های تصادفی مانند Status035Enum می‌سازد و هشدار می‌دهد.
    'ENUM_NAME_OVERRIDES': {
        'OrderStatusEnum': 'orders.models.Order.STATUS_CHOICES',
        'ProductStatusEnum': 'products.models.Product.STATUS_CHOICES',
        'PaymentStatusEnum': 'payments.models.Payment.STATUS_CHOICES',
        'SmsLogStatusEnum': 'notifications.models.SmsLog.STATUS_CHOICES',
    },
}
ENABLE_API_DOCS = config('ENABLE_API_DOCS', default=DEBUG, cast=bool)
DJANGO_ADMIN_PATH = config('DJANGO_ADMIN_PATH', default='django-admin/').strip('/') + '/'

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173' if DEBUG else '').rstrip('/')
if not DEBUG and not FRONTEND_URL.startswith('https://'):
    raise RuntimeError('FRONTEND_URL must be an HTTPS URL in production')
# مقادیر درگاه و ارسال از پنل مدیر (SiteSettings) خوانده می‌شوند؛ این‌ها فقط مقدار اولیه
# هنگام نخستین راه‌اندازی هستند و پس از آن ملاک، چیزی است که در پنل ذخیره شده است.
ZARINPAL_MERCHANT_ID = config('ZARINPAL_MERCHANT_ID', default='').strip()
ZARINPAL_SANDBOX = config('ZARINPAL_SANDBOX', default=True, cast=bool)
ORDER_RESERVATION_MINUTES = config('ORDER_RESERVATION_MINUTES', default=30, cast=int)
PAYMENT_AUTHORITY_REUSE_MINUTES = config('PAYMENT_AUTHORITY_REUSE_MINUTES', default=20, cast=int)
PAYMENT_RESERVATION_MINUTES = config('PAYMENT_RESERVATION_MINUTES', default=120, cast=int)
FREE_SHIPPING_THRESHOLD = config('FREE_SHIPPING_THRESHOLD', default=500000, cast=int)
FLAT_SHIPPING_COST = config('FLAT_SHIPPING_COST', default=30000, cast=int)
if FREE_SHIPPING_THRESHOLD < 0 or FLAT_SHIPPING_COST < 0:
    raise RuntimeError('Shipping values cannot be negative')

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=not DEBUG, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=not DEBUG, cast=bool)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0 if DEBUG else 3600, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)

DATA_UPLOAD_MAX_MEMORY_SIZE = config('DATA_UPLOAD_MAX_MEMORY_SIZE', default=10 * 1024 * 1024, cast=int)
FILE_UPLOAD_MAX_MEMORY_SIZE = config('FILE_UPLOAD_MAX_MEMORY_SIZE', default=5 * 1024 * 1024, cast=int)

LOG_LEVEL = config('LOG_LEVEL', default='INFO')
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {'format': '{asctime} {levelname} {name} {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'standard'},
    },
    'root': {'handlers': ['console'], 'level': LOG_LEVEL},
    'loggers': {
        'django.security': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'payments': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
        'notifications': {'handlers': ['console'], 'level': LOG_LEVEL, 'propagate': False},
    },
}
