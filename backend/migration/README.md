Migration and testing instructions

Prerequisites
- Node.js and npm installed
- A Postgres connection string available as `DATABASE_URL` (or set `SUPABASE_DB_URL`)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `backend/.env` for runtime

Apply DB schema

Install dependencies and run the schema apply script:

```bash
cd backend
npm install
npm run apply-schema
```

Notes: The script reads `backend/db/schema.sql` and applies it using the `DATABASE_URL` env var.

Run the backend for local testing

```bash
# from repo root
cd backend
# ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL if needed
npm run dev
```

Create initial admin user (if not present)

```bash
cd backend
npm run init-admin
```

Test blog admin flow (example using curl)

1. Login to obtain token (replace values):

```bash
curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"changeme"}'
```

2. Create a blog (use Authorization header with Bearer token):

```bash
curl -s -X POST http://localhost:3000/blogs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Hello Blog","content":"<p>First post</p>","status":"PUBLISHED"}'
```

3. View public list:

```bash
curl http://localhost:3000/blogs/public
```

Verify invoice/GST changes

1. Generate an invoice via order flow or call the invoice endpoint; PDF header/footer should contain:
- Company: The Awla Foods Pvt Ltd
- GSTIN: 08AAMCT9879P1ZV

If you want me to run these commands or apply the migration for you, grant access to your database or provide `DATABASE_URL` in a run request and I'll execute the migration locally.
