# LensFlow Order Management System

Production-ready B2B contact lens order management app with a static frontend for Vercel and a Node/MongoDB API for Railway.

## Architecture

- Frontend: vanilla HTML/CSS/JS, deployed on Vercel.
- Backend: Express API, deployed on Railway.
- Database: MongoDB Atlas, configured through `MONGODB_URI`.
- Persistence model: the existing order-management workspace state is stored in MongoDB and seeded on first API boot.

## Local Setup

Install Node.js 20+, then:

```sh
npm install
cp .env.example .env
```

Edit `.env` with a MongoDB Atlas connection string and a `JWT_SECRET` (any long random string - used to sign login sessions).

Run the API:

```sh
npm run start:server
```

Run the frontend in another terminal:

```sh
npm run dev
```

Open `http://localhost:4173`.

## Demo Login

Passwords are real - verified server-side against a bcrypt hash, not client-side.

- Admin: `admin@lensflow.local` / `admin123`
- Ops staff: `ops@lensflow.local` / `ops123`
- Dealer: `dealer@lensflow.local` / `dealer123`
- Retailer: `retailer@lensflow.local` / `retailer123`

Login issues a JWT (`JWT_SECRET`, 12h expiry) that the frontend sends as `Authorization: Bearer <token>` on every request.

## MongoDB Atlas

1. Create an Atlas cluster.
2. Create a database user.
3. Allow Railway outbound access in Network Access. For a quick first deploy, `0.0.0.0/0` works, but tighten this when your production networking is finalized.
4. Copy the connection string and set it as `MONGODB_URI`.

Example:

```sh
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/lensflow_oms?retryWrites=true&w=majority
```

## Railway Backend

Deploy this repository to Railway with the included `railway.json`.

Set these Railway variables:

```sh
NODE_ENV=production
MONGODB_URI=your-mongodb-atlas-uri
CORS_ORIGINS=https://your-vercel-app.vercel.app
JWT_SECRET=a-long-random-string
```

Railway will run:

```sh
npm start
```

Health check:

```txt
/health
```

## Vercel Frontend

Deploy this repository to Vercel with the included `vercel.json`.

Set this Vercel environment variable:

```sh
VITE_API_BASE_URL=https://your-railway-service.up.railway.app
```

Vercel will run:

```sh
npm run build
```

The build writes `dist/config.js`, so the browser calls the Railway API instead of localhost.

## API

- `GET /health` - API and database health (no auth).
- `POST /api/auth/login` - `{ email, password }` -> `{ token, user }`. Verifies the bcrypt password hash server-side.
- `POST /api/customer-actions/register` - `{ name, contactPerson, phone, email, password, gstin, line1, line2, city, state, pincode }`. Creates a `PendingApproval` customer. No auth required (that's the point of self-registration), but the account can't do anything until an admin approves it.
- `POST /api/customer-actions/orders` - authenticated customer only. Submits the cart; price, GST and MOQ are resolved from the server-side catalog, never trusted from the client.
- `PATCH /api/customer-actions/notification-preferences` - authenticated customer only. Updates the caller's own record.
- `GET /api/state` - authenticated (admin or customer). Fetch the shared OMS state (password hashes are stripped before the response).
- `PUT /api/state` - **admin only**. Persists the full shared OMS state; this is how the admin UI's approve/reject/suspend/catalog/order-status/admin-user actions all sync.
- `POST /api/reset-seed` - **admin only**, and only when `ALLOW_SEED_RESET=true`.

All mutating endpoints are rate-limited (`STATE_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_MAX`).

## Included Workflows

- Account-based login for admin, dealer, and retailer roles
- Dealer/retailer registration and approval handling
- Catalog browsing with tier-specific pricing
- Cart, MOQ validation, GST totals, and order submission
- Admin order lifecycle, edit/version history, invoice and shipping label print views
- Catalog, customer master, reports, notifications, and admin user management
