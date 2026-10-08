# Inventory & Sales Management API

Production-ready REST API built with **Node.js (ESM) + Express + MongoDB/Mongoose**, featuring
stateless JWT auth with refresh-token rotation, ACID sales transactions, and MongoDB
aggregation-powered analytics.

## Quick Start

```bash
cp .env.example .env      # fill in your values (JWT secrets must be ≥ 32 chars)
npm install
npm run dev               # or: npm start
```

> ⚠️ **Transactions require a MongoDB replica set.** Local standalone mongod won't work
> with `startSession()`. Use MongoDB Atlas (free tier is a replica set) or run a local
> replica set:
> ```bash
> mongod --replSet rs0 --dbpath /data/db
> mongosh --eval 'rs.initiate()'
> ```

The first registered user automatically becomes an **Admin**.

## Architecture

```
src/
├── config/        # env validation (zod), DB connection
├── models/        # User, RefreshToken, Product, Category, Sale, InventoryLog
├── services/      # business logic (auth, sales txn, products, analytics)
├── controllers/   # lean HTTP handlers
├── routes/        # route definitions wired to middleware + validators
├── middlewares/   # auth, RBAC, zod validation, rate limiting, error handling
├── validators/    # zod schemas (body / query / params)
└── utils/         # ApiError, asyncHandler, jwt helpers, logger
```

## Auth flow

1. `POST /api/auth/register` → creates user (first user = Admin)
2. `POST /api/auth/login` → returns **access token in JSON** (15 min default) and sets the
   **refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie** scoped to `/api/auth`.
3. `POST /api/auth/refresh` → rotates the refresh token (new cookie + new access token).
   Old tokens are revoked; reuse of a rotated token revokes the entire token family.
4. `POST /api/auth/logout` / `logout-all` → revoke tokens.

Client usage: send `Authorization: Bearer <accessToken>` on every request; call `/refresh`
when a 401 arrives.

## RBAC

| Capability                        | Admin | Manager | Cashier |
|-----------------------------------|:-----:|:-------:|:-------:|
| Register/login, view catalog      |  ✅   |   ✅    |   ✅    |
| Create sales                      |  ✅   |   ✅    |   ✅    |
| Create/edit/archive products      |  ✅   |   ✅    |   ❌    |
| Stock adjustments (restock etc.)  |  ✅   |   ✅    |   ❌    |
| View sales history                |  ✅   |   ✅    | own only*|
| Analytics dashboard, inventory logs|  ✅   |   ✅    |   ❌    |

\* Cashiers can fetch a sale by ID (for receipts); list endpoint is Admin/Manager.

## Endpoints

**Auth:** `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/logout-all` · `GET /auth/me`

**Products:** `GET/POST /products` · `GET/PATCH/DELETE /products/:id` · `PATCH /products/:id/stock`
(query params: `search`, `category`, `lowStock=true`, `includeArchived`, pagination + sorting)

**Categories:** `GET/POST /categories` · `PATCH/DELETE /categories/:id`

**Sales:** `POST /sales` · `GET /sales` (Admin/Manager) · `GET /sales/:id`

**Analytics (Admin/Manager):**
- `GET /analytics/dashboard` — everything below in one call
- `GET /analytics/sales-performance?startDate&endDate`
- `GET /analytics/low-stock`
- `GET /analytics/inventory-valuation`
- `GET /analytics/top-sellers?limit=10`
- `GET /analytics/breakdown?groupBy=category|cashier`
- `GET /analytics/revenue-trend`

**Inventory:** `GET /inventory/logs?productId&page&limit`

All date params are ISO-8601 (`?startDate=2026-09-01&endDate=2026-09-30`).

## Security hardening

- `helmet` security headers · strict CORS allow-list with credentials
- Global + auth rate limiters (brute-force / DDoS)
- Zod validation on every body/query/params (blocks NoSQL injection & payload pollution)
- bcrypt (cost 12) async password hashing; secrets never leave the server
- Refresh tokens: hashed at rest, httpOnly cookie, rotation + reuse detection, TTL index cleanup
- Payload capped at 100 kb; centralized error handler never leaks stack traces in production

## Sample: create a sale

```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"66f...","quantity":2}],"paymentMethod":"card"}'
```

Stock is decremented **atomically inside a Mongoose session transaction** — if any line
fails (e.g. insufficient stock), the whole sale is rolled back and an `InventoryLog`
audit trail is written only on success.
