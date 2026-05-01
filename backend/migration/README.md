Migration and testing instructions

Prerequisites
- Node.js and npm installed
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `backend/.env` for runtime

Apply DB schema

Install dependencies and run the schema apply script:

```bash
cd backend
npm install
npm run apply-schema
```

Notes: `backend/migration/applySchema.ts` reads `SUPABASE_URL`. If that variable is your HTTPS API URL, the script will stop and tell you to use the Supabase SQL editor or a real Postgres connection string.

Run the backend for local testing

```bash
# from repo root
cd backend
# ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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

Supabase SQL fallback

If you prefer to create the blogs table manually in Supabase, open `backend/migration/create-blogs-table.sql` and paste it into the SQL editor.

If you want me to run these commands or apply the migration for you, I need the actual Supabase Postgres connection string; `SUPABASE_URL` alone is only the REST/API base URL.
