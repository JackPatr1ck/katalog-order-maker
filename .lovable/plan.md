# Katalog — Plan

A platform where vendors build a product catalog, share a public storefront link, and receive structured orders via WhatsApp notifications.

## 1. Vendor signup (two-step)

**Step 1 — Account credentials**

- Email + password (Lovable Cloud auth)
- Email confirmation can be disabled for faster testing

**Step 2 — Business profile**

- Business name
- WhatsApp number (E.164 format, validated)
- Storefront slug (auto-generated from business name, editable, must be unique → used in public URL `/s/{slug}`)
- Optional: logo, short description, currency

Both steps must be completed before reaching the dashboard. A guard route checks that a profile exists; if not, it redirects to step 2.

Login: email + password. Logout from dashboard.

## 2. Vendor dashboard

Sidebar navigation: **Catalog**, **Orders**, **Settings**.

### Catalog

- **Categories**: create / rename / delete, ordered list
- **Products**: name, description, price, image upload, stock quantity, category, active toggle
- Out-of-stock products appear greyed out on storefront and can't be ordered
- Grid view with edit/delete actions

### Orders

- Table: order #, customer name, phone, items count, total, date
- Click row → full order detail (items, customer, delivery address, notes)
- Filter by date range
- **Export to CSV** button (current filtered view)

### Settings

- Edit business name, WhatsApp number, slug, logo, currency
- Copy public storefront link

## 3. Public storefront `/s/{slug}`

- Vendor branding (logo, name) at top
- Products grouped by category, with images, prices, stock badge
- "Add to cart" on each product (cart stored in localStorage, scoped to slug)
- Floating cart with line items + total
- **Checkout form**: customer name, phone, delivery address, optional note
- On submit: order is saved to the database, then a WhatsApp notification is sent to the vendor's number with a structured summary

## 4. WhatsApp notification flow

Customer submits the order form → server function:

1. Validates input (Zod)
2. Inserts the order + line items, decrements stock
3. Sends a Twilio SMS/WhatsApp message to the vendor's stored WhatsApp number with a formatted summary:

```text
New Katalog order #1042
Customer: Jane Doe — +234 801 234 5678
Address: 12 Allen Ave, Ikeja
---
2× Red T-Shirt — ₦10,000
1× Blue Cap — ₦3,500
---
Total: ₦23,500
Note: Please deliver before 6pm
View: https://katalog.app/o/abc123
```

Twilio is added as a connector. The vendor's WhatsApp number (collected at signup) is the recipient. A single Twilio sender (your account's WhatsApp/SMS number) sends to all vendors.

If Twilio fails, the order is still saved and a warning is shown to the customer ("Order placed — vendor will be notified shortly"). The vendor sees the order in the dashboard regardless.

## 5. Data model

- `vendor_profiles` (user_id PK, business_name, whatsapp_number, slug unique, logo_url, currency, description)
- `categories` (id, vendor_id, name, position)
- `products` (id, vendor_id, category_id, name, description, price_cents, image_url, stock, is_active)
- `orders` (id, vendor_id, customer_name, customer_phone, delivery_address, note, total_cents, status, created_at)
- `order_items` (id, order_id, product_id, product_name_snapshot, unit_price_cents, quantity)

RLS: vendors only read/write their own rows. Public storefront and order creation use a server function with the admin client (scoped by slug) so customers don't need accounts.

## 6. Pages / routes

- `No landing page needed`
- `/auth` — login + signup (step 1)
- `/onboarding` — signup step 2 (business profile)
- `/dashboard` — orders summary (default)
- `/dashboard/catalog` — products + categories
- `/dashboard/orders` — orders list + CSV export
- `/dashboard/settings` — business profile
- `/s/$slug` — public storefront + checkout
- `/o/$orderId` — public order receipt (accessed via WhatsApp link)

## Technical notes

- TanStack Start, Lovable Cloud (Supabase) for auth + DB + storage (product images)
- Twilio connector for WhatsApp/SMS sending from a server function
- Zod validation on all forms and the order server function
- Image uploads to a public Supabase storage bucket
- CSV export generated client-side from the filtered orders array

## What you'll be asked to approve next

- Connecting **Twilio** (for WhatsApp notifications) — you'll need a Twilio account with WhatsApp sender enabled, or SMS as a fallback
- Enabling **Lovable Cloud** for auth, database, and image storage