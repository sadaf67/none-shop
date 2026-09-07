# راهنمای استقرار production «ن وان»

این راهنما برای یک VPS لینوکسی با Docker Engine و Docker Compose Plugin نوشته شده است. معماری same-origin است: مرورگر فقط با دامنه اصلی ارتباط دارد؛ Nginx داخل Compose مسیرهای `/api/`، `/django-admin/`، `/health/`، `/robots.txt`، `/sitemap.xml`، `/feeds/`، `/static/` و `/media/` را به مقصد درست می‌فرستد و بقیه مسیرها به SPA می‌رسند. Postgres هیچ پورت عمومی ندارد.

## ۱. پیش‌نیازهای واقعی

- یک VPS لینوکسی به‌روز با Docker و Compose Plugin
- دامنه‌ای که رکوردهای DNS آن به IP سرور اشاره کنند
- TLS معتبر روی دامنه (Caddy یا Nginx میزبان به‌همراه گواهی معتبر)
- Merchant ID واقعی زرین‌پال برای پرداخت production
- کاتالوگ، تصویر، موجودی، اطلاعات تماس و متن‌های حقوقی واقعی
- فضای بکاپ خارج از همان VPS

بدون موارد بالا انتشار عمومی کامل نیست. هیچ رمز، دامنه، داده محصول یا ادعای تجاری نمونه را به‌عنوان مقدار واقعی منتشر نکنید.

## ۲. ساخت تنظیمات محرمانه

در ریشه پروژه:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

برای `SECRET_KEY` و رمز دیتابیس مقدار تصادفی مستقل بسازید:

```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(64))'
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
```

در `.env.production` این موارد را حتماً اصلاح کنید:

- `SECRET_KEY`
- `POSTGRES_PASSWORD` و همان مقدار در بخش password از `DATABASE_URL`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `FRONTEND_URL`
- `ZARINPAL_MERCHANT_ID`

رمز دیتابیس را URL-safe انتخاب کنید تا `DATABASE_URL` خراب نشود. `backend` را در `ALLOWED_HOSTS` نگه دارید چون healthcheck داخلی از همین Host استفاده می‌کند. در حالت same-origin معمولاً `CORS_ALLOWED_ORIGINS` خالی می‌ماند.

## ۳. TLS و ورودی عمومی

Compose به‌صورت پیش‌فرض فقط روی `127.0.0.1:8080` گوش می‌دهد. یک reverse proxy روی میزبان باید HTTPS را خاتمه دهد و درخواست را به این آدرس بفرستد. نمونه حداقلی Caddyfile:

```caddyfile
example.com, www.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

`example.com` را در Caddyfile و `.env.production` با دامنه واقعی عوض کنید. فقط پورت‌های 22، 80 و 443 موردنیاز را در فایروال باز نگه دارید؛ پورت 8080 و دیتابیس نباید عمومی شوند. پراکسی بیرونی باید `X-Forwarded-Proto` را ارسال کند؛ Nginx داخل پروژه آن را برای Django حفظ می‌کند.

## ۴. اعتبارسنجی و راه‌اندازی

ابتدا رندر Compose را بدون نمایش عمومی سرویس بررسی کنید:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose --env-file .env.production -f docker-compose.production.yml build --pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

entrypoint بک‌اند هنگام شروع، migrationها و `collectstatic` را اجرا می‌کند. لاگ‌ها را بررسی کنید:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 backend scheduler frontend db
```

بعد از بالا آمدن TLS:

```bash
curl --fail --show-error https://example.com/health/
```

خروجی health باید موفق باشد. سپس صفحه اصلی، ورود، ثبت‌نام، سبد، ثبت سفارش، بازگشت از درگاه، پنل مدیریت و نمایش تصاویر را روی دامنه واقعی آزمایش کنید.

## ۵. ساخت مدیر production

مدیر را داخل دیتابیس production بسازید؛ رمزهای محلی یا رمزهایی که قبلاً در گفتگو/فایل دیده شده‌اند امن محسوب نمی‌شوند:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

پنل Django در `https://example.com/django-admin/` است. برای مدیر یک رمز طولانی و یکتا انتخاب کنید و حساب اضافی نسازید.

## ۶. درگاه و محتوای فروشگاه

- `ZARINPAL_SANDBOX=False` فقط همراه Merchant ID واقعی مجاز است.
- callback پرداخت از `FRONTEND_URL/payment/verify` ساخته می‌شود؛ این URL باید HTTPS و از اینترنت قابل دسترس باشد.
- پیش از انتشار، یک پرداخت واقعی با مبلغ کم و همچنین حالت لغو/خطا را تست و نتیجه سفارش و موجودی را کنترل کنید.
- دسته‌بندی، محصول، تصویر، قیمت، موجودی و تنوع سایز/رنگ را با داده واقعی وارد کنید.
- اطلاعات تماس، قوانین مرجوعی، حریم خصوصی و شرایط فروش باید متعلق به همان کسب‌وکار باشند؛ متن یا نشان اعتماد ساختگی منتشر نکنید.
- سرویس `scheduler` هر پنج دقیقه سفارش‌های پرداخت‌نشده منقضی را لغو و موجودی رزروشده را آزاد می‌کند؛ سفارش بدون درگاه/ناموفق پس از `ORDER_RESERVATION_MINUTES` و authority معلق درگاه پس از `PAYMENT_RESERVATION_MINUTES` منقضی می‌شود. زنده‌بودن scheduler را در `docker compose ps` و لاگ‌ها کنترل کنید.

## ۷. پنل پیامکی

کلید و رمز ارائه‌دهنده پیامک **فقط از پنل مدیریت** (`/admin/sms` و `/admin/settings` بخش «پیامک») وارد می‌شود و در `.env` قرار نمی‌گیرد. این مقادیر در پاسخ اندپوینت عمومی تنظیمات برنمی‌گردند.

- ارائه‌دهنده را انتخاب کنید (کاوه‌نگار، SMS.ir یا ملی‌پیامک) و اعتبارنامه واقعی همان سرویس را وارد کنید.
- برای ورود با کد یک‌بارمصرف، `otp_login_enabled` را روشن کنید. اگر پنل پیامکی کار نکند ورود OTP هم کار نمی‌کند؛ ورود با رمز عبور همچنان فعال می‌ماند.
- الگوهای پیامک رویدادی (ثبت سفارش، پرداخت، ارسال، تحویل) کلید فعال/غیرفعال جداگانه دارند.
- در فرم تنظیمات، **فیلد محرمانه خالی یعنی «تغییر نکن»** — برای پاک‌کردن یک کلید باید مقدار جدید بگذارید، نه اینکه خالی ذخیره کنید.
- پیش از تحویل، یک پیامک آزمایشی از `/admin/sms` بفرستید و وضعیت آن را در جدول لاگ همان صفحه ببینید.

## ۸. ترب، ایمالز و سئو

این مسیرها را جنگو به‌صورت داینامیک از روی کاتالوگ واقعی می‌سازد و `deploy/nginx.conf` آن‌ها را به بک‌اند پراکسی می‌کند:

| مسیر | مصرف‌کننده |
| --- | --- |
| `/feeds/torob.xml` | ترب |
| `/feeds/emalls.xml` | ایمالز |
| `/feeds/products.json` | هر موتور مقایسه قیمت دیگر |
| `/sitemap.xml` | موتورهای جست‌وجو |
| `/robots.txt` | موتورهای جست‌وجو |

نکات مهم:

- **قیمت‌ها در پایگاه داده تومان ذخیره می‌شوند و در فید به ریال (×۱۰) تبدیل می‌شوند.** این همان چیزی است که ترب و ایمالز انتظار دارند؛ ضریب را تغییر ندهید مگر اینکه خودِ سرویس چیز دیگری بخواهد.
- فقط محصولاتی در فید می‌آیند که `status=active` و `include_in_feeds=True` باشند. این کلید در تب «سئو» ویرایشگر محصول است.
- فیدها ۳۰ دقیقه cache می‌شوند؛ بعد از تغییر قیمت انبوه بلافاصله خروجی به‌روز نمی‌شود.
- کلیدهای `torob_feed_enabled` و `emalls_feed_enabled` در تنظیمات سایت هستند. اگر خاموش باشند مسیر مربوطه 404 می‌دهد.
- `feed_default_guarantee` و `feed_shipping_days` مقدار پیش‌فرض گارانتی و زمان ارسال را برای محصولاتی که مقدار اختصاصی ندارند تعیین می‌کنند.

پس از بالا آمدن دامنه، خروجی را کنترل کنید و سپس آدرس فید را در پنل فروشنده ترب و ایمالز ثبت کنید:

```bash
curl --fail --show-error https://example.com/robots.txt
curl --fail --show-error https://example.com/sitemap.xml | head -20
curl --fail --show-error https://example.com/feeds/torob.xml | head -30
curl --fail --show-error https://example.com/feeds/emalls.xml | head -30
```

`robots.txt` استاتیک داخل `frontend/public/` هم وجود دارد، ولی در Nginx تطبیق دقیق `location = /robots.txt` بر `location /` اولویت دارد، پس همیشه نسخه داینامیک جنگو سرو می‌شود. اگر روزی reverse proxy را عوض کردید، این اولویت را از دست ندهید وگرنه ترب و ایمالز به‌جای فید، صفحه SPA می‌گیرند.

## ۹. تحویل پنل مدیریت به مشتری

تقریباً همه محتوای سایت از پنل قابل تغییر است و نیازی به دخالت برنامه‌نویس ندارد:

- `/admin/settings` — نام و شعار سایت، لوگو، favicon، رنگ اصلی، اطلاعات تماس و آدرس، شبکه‌های اجتماعی، نماد اعتماد و ساماندهی، هزینه و آستانه ارسال رایگان، مالیات، درگاه پرداخت، پیامک، سئو و اطلاعیه بالای سایت
- `/admin/products` — محصول، گالری تصاویر، تنوع سایز/رنگ، تکثیر محصول، عملیات گروهی و تغییر درصدی قیمت
- `/admin/pages` و `/admin/faqs` — متن قوانین، حریم خصوصی، درباره ما و پرسش‌های متداول
- `/admin/banners` — بنرهای صفحه اصلی با بازه زمانی شروع/پایان
- `/admin/orders` — تغییر وضعیت سفارش با گذارهای مجاز؛ وضعیت «پرداخت‌شده» فقط با تأیید درگاه ثبت می‌شود و از پنل قابل تنظیم دستی نیست
- `/admin/sms`، `/admin/messages`، `/admin/reviews`، `/admin/customers`، `/admin/coupons`

حالت «تعمیرات» (`maintenance_*`) سایت را برای کاربران می‌بندد ولی دسترسی مدیر باقی می‌ماند؛ پیش از استفاده روی محیط آزمایشی تمرین کنید.

## ۱۰. PWA

- `sw.js` با هدر `no-store` سرو می‌شود تا کاربر روی نسخه قدیمی گیر نکند؛ این را در هیچ reverse proxy جدیدی خراب نکنید.
- آیکون‌ها در `frontend/public/icons/` هستند و با `python scripts/make_icons.py` از روی طرح نشان بازتولید می‌شوند (نیازمند Pillow).
- PWA فقط روی HTTPS نصب می‌شود؛ روی HTTP دکمه نصب ظاهر نمی‌شود.
- پس از هر انتشار، یک‌بار با حالت ناشناس سایت را باز کنید تا service worker جدید فعال شود و صفحه offline را هم تست کنید.

## ۱۱. بکاپ

اسکریپت، dump فشرده Postgres و آرشیو media را با checksum می‌سازد. روی سرور:

```bash
chmod 700 deploy/backup.sh
./deploy/backup.sh
```

بکاپ‌ها به‌طور پیش‌فرض در `backups/` ذخیره و نسخه‌های قدیمی‌تر از ۱۴ روز حذف می‌شوند. می‌توان مسیر و نگهداری را تغییر داد:

```bash
BACKUP_DIR=/srv/backups/n-one RETENTION_DAYS=30 ./deploy/backup.sh
```

حداقل یک نسخه رمزگذاری‌شده را خودکار به سرور/فضای دیگری منتقل کنید. نگه‌داشتن تنها بکاپ روی همان VPS قابل قبول نیست. بازیابی را قبل از انتشار روی محیط آزمایشی تمرین کنید.

بازیابی دیتابیس با `pg_restore --clean` داده فعلی را جایگزین می‌کند؛ آن را فقط پس از گرفتن بکاپ تازه و توقف ترافیک انجام دهید. نمونه زیر عمداً باید با مسیر نسخه موردنظر تکمیل شود:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml stop frontend backend
cat /path/to/database.dump | docker compose --env-file .env.production -f docker-compose.production.yml exec -T db sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_restore --clean --if-exists --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'
cat /path/to/media.tar.gz | docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps -e RUN_MIGRATIONS=false -e RUN_COLLECTSTATIC=false backend sh -c 'cd /var/www/media && exec tar -xzf -'
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

## ۱۲. به‌روزرسانی

قبل از هر به‌روزرسانی بکاپ بگیرید، نسخه کد را ثبت/آرشیو کنید و سپس:

```bash
./deploy/backup.sh
docker compose --env-file .env.production -f docker-compose.production.yml build --pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

این مخزن rollback خودکار یا انتشار zero-downtime ندارد. برای بازگشت باید نسخه قبلی کد/ایمیج و بکاپ سازگار را از قبل نگه دارید.

> **اگر قبلاً با نام پروژه قدیمی (`kafash-bashi`) مستقر کرده‌اید:** نام پروژه Compose به `n-one` تغییر کرده و Docker حجم‌ها را با پیشوند نام پروژه می‌سازد. با نام جدید، سرویس‌ها حجم‌های **خالی** می‌گیرند و داده قبلی از دست‌رفته به‌نظر می‌رسد. پیش از اولین اجرای نسخه جدید بکاپ بگیرید، استک قدیمی را با `docker compose -p kafash-bashi ... down` پایین بیاورید و سپس بکاپ را طبق بخش بازیابی داخل استک جدید restore کنید. برای استقرار تازه این نکته موضوعیت ندارد.

## ۱۳. چک‌لیست قبل از بازکردن سایت برای کاربران

**زیرساخت**
- HTTPS و ریدایرکت HTTP به HTTPS بدون loop
- پاسخ موفق `/health/` و نبود خطای migration در لاگ
- صفحات داخلی React با refresh مستقیم بدون 404
- بکاپ زمان‌بندی‌شده، انتقال خارج از VPS و تست بازیابی
- مانیتورینگ uptime و فضای دیسک

**امنیت**
- رمزها و Merchant ID واقعی، بدون placeholder
- مدیر production جدید با رمز یکتا
- `ENABLE_API_DOCS=False` روی production (مستندات API نباید عمومی باشد)
- `DEBUG=False` و `ALLOWED_HOSTS` بدون `*`

**فروش**
- محصولات، قیمت‌ها، تصاویر و موجودی واقعی
- پرداخت موفق، ناموفق و لغوشده تست‌شده
- قوانین فروش، مرجوعی، حریم خصوصی و اطلاعات تماس واقعی
- نماد اعتماد الکترونیکی و ساماندهی واقعی در تنظیمات

**پیامک**
- یک پیامک آزمایشی موفق از `/admin/sms`
- در صورت فعال‌بودن ورود OTP، یک ورود کامل با کد پیامکی

**ترب، ایمالز و سئو**
- `curl https://example.com/feeds/torob.xml` خروجی XML بدهد، نه HTML صفحه SPA
- `curl https://example.com/feeds/emalls.xml` خروجی XML بدهد
- `robots.txt` و `sitemap.xml` از دامنه واقعی و با آدرس‌های https پاسخ بدهند
- قیمت‌های داخل فید ریال باشند (۱۰ برابر قیمت نمایش‌داده‌شده در سایت)
- آدرس فید در پنل فروشنده ترب و ایمالز ثبت شده باشد

**PWA**
- دکمه نصب روی موبایل ظاهر شود
- صفحه offline کار کند
- پس از انتشار جدید، service worker به‌روز شود (کش `sw.js` نمانَد)
