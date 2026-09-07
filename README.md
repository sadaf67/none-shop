# ن وان (N ONE)

فروشگاه اینترنتی با بک‌اند Django REST Framework و فرانت‌اند React/Vite. مسیر production این مخزن برای یک VPS لینوکسی طراحی شده است: Postgres برای داده، Gunicorn برای Django و Nginx برای ارائه SPA و پراکسی هم‌مبدأ API.

## قابلیت‌ها

**فروشگاه**
- کاتالوگ، جست‌وجو، فیلتر و مرتب‌سازی؛ دسته‌بندی درختی، برند و برچسب
- تنوع سایز/رنگ با موجودی مستقل و رزرو اتمیک موجودی
- سبد مهمان و ادغام خودکار پس از ورود، کوپن تخفیف، ثبت سفارش و رهگیری
- علاقه‌مندی، نظر و امتیاز با تأیید مدیر
- درگاه پرداخت (زرین‌پال / زیبال / آیدی‌پی / نکست‌پی) با حالت sandbox

**ورود و پیامک**
- ورود با رمز عبور و ورود با کد یک‌بارمصرف (OTP)
- ارائه‌دهنده‌های پیامک: کاوه‌نگار، SMS.ir و ملی‌پیامک
- پیامک خودکار رویدادها (ثبت سفارش، پرداخت، ارسال، تحویل) با کلید فعال/غیرفعال جداگانه
- ارسال پیامک دستی و گزارش وضعیت ارسال‌ها از پنل

**پنل مدیریت داینامیک**
- محصولات با ویرایشگر چندتبی (اطلاعات، قیمت، گالری تصاویر، تنوع‌ها، سئو)، تکثیر محصول و عملیات گروهی (انتشار/پیش‌نویس/آرشیو و تغییر درصدی قیمت)
- دسته‌بندی، برند، برچسب، بنر، صفحات ثابت، پرسش‌های متداول، کدهای تخفیف
- سفارش‌ها با گذارِ وضعیت کنترل‌شده، مشتریان، نظرات، پیام‌های تماس و اعضای خبرنامه
- **تنظیمات سایت**: بیش از ۹۰ کلید در ۹ گروه (برند، تماس، شبکه‌های اجتماعی، نمادهای اعتماد، ارسال، پرداخت، پیامک، سئو، اطلاعیه) — همه از پنل و بدون تغییر کد
- داشبورد با نمودار درآمد، پرفروش‌ترین‌ها، توزیع وضعیت سفارش و هشدارهای عملیاتی

**سئو و مقایسه قیمت**
- فید ترب: `/feeds/torob.xml`
- فید ایمالز: `/feeds/emalls.xml`
- فید عمومی JSON: `/feeds/products.json`
- `sitemap.xml` و `robots.txt` داینامیک از روی داده واقعی کاتالوگ
- متا تگ‌ها، Open Graph و داده ساختاریافته در فرانت‌اند

**PWA و رابط کاربری**
- manifest، service worker، صفحه offline و آیکون‌های maskable
- طراحی ریسپانسیو راست‌به‌چپ با تم روشن/تاریک
- ولیدیشن فرم‌ها با zod و react-hook-form

## اجرای محلی

در ویندوز می‌توان از `start.bat` استفاده کرد. تنظیمات محلی بک‌اند در `backend/.env` قرار می‌گیرد و نباید commit شود.

```bash
# بک‌اند
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# فرانت‌اند
cd frontend
npm install
npm run dev
```

بررسی سلامت پیش از commit:

```bash
cd backend  && python manage.py test && python manage.py makemigrations --check --dry-run
cd frontend && npx tsc --noEmit && npm run build
```

## ساختار مخزن

| مسیر | توضیح |
| --- | --- |
| `backend/` | پروژه Django (اپ‌های core، products، orders، payments، discounts، reviews، users، notifications، feeds) |
| `frontend/` | اپ React + Vite + Tailwind 4 |
| `deploy/` | `nginx.conf` و `backup.sh` |
| `scripts/` | `make_icons.py` برای بازتولید آیکون‌های PWA از طرح نشان |
| `docker-compose.production.yml` | دیتابیس، بک‌اند، scheduler رزروهای منقضی و فرانت‌اند |
| `.env.production.example` | فهرست متغیرهای لازم، بدون secret واقعی |
| `DEPLOYMENT.md` | راهنمای کامل DNS، TLS، راه‌اندازی، فیدها، بکاپ و کنترل نهایی |

## استقرار production

شروع سریع پس از تکمیل دامنه و secretها:

```bash
cp .env.production.example .env.production
# .env.production را با مقادیر واقعی و امن ویرایش کنید.
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

جزئیات و محدودیت‌های راه‌اندازی در [DEPLOYMENT.md](DEPLOYMENT.md) آمده است. وجود فایل‌های Docker به‌تنهایی به معنی آماده‌بودن کسب‌وکار برای انتشار عمومی نیست؛ دامنه، TLS، شناسه واقعی درگاه، محتوای واقعی، تست پرداخت و بکاپ خارج از سرور باید توسط مالک سرویس تکمیل و تأیید شوند.

این بسته برای هاست اشتراکی صرفاً PHP مناسب نیست؛ VPS یا سرویس دارای Docker، PostgreSQL و reverse proxy لازم است.

## نکات امنیتی که هنگام توسعه باید حفظ شوند

- **HTML ورودی مدیر روی سرور و هنگام ذخیره پاک‌سازی می‌شود** — `enamad_html` و `samandehi_html` با `sanitize_badge_html`، و `Page.content` و `FAQ.answer` با `clean_rich_html`. همین باعث می‌شود استفاده از `dangerouslySetInnerHTML` در فرانت‌اند امن باشد. **هر فیلد HTML جدیدی که مدیر پر می‌کند باید همین پاک‌سازی را بگیرد.**
- کلیدهای محرمانه (`gateway_merchant_id`، `sms_api_key`، `sms_username`، `sms_password`، `sms_admin_phone`) از سریالایزر عمومی تنظیمات حذف شده‌اند و **نباید در هیچ اندپوینت عمومی برگردند**.
- در `AdminSettingsSerializer.update`، مقدار خالی برای `sms_api_key` و `sms_password` یعنی «تغییر نکن»، نه «پاک کن». فرانت‌اند هم فیلد محرمانه خالی را اصلاً ارسال نمی‌کند.
- تغییر وضعیت سفارش فقط از گذارهای مجاز عبور می‌کند و وضعیت `paid` تنها با تأیید درگاه ثبت می‌شود.
