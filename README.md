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

Edit `.env` with a MongoDB Atlas connection string.

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

- Admin: `admin@lensflow.local`
- Dealer: `dealer@lensflow.local`
- Retailer: `retailer@lensflow.local`

Any password works in this prototype flow.

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

- `GET /health` - API and database health.
- `GET /api/state` - Fetch the shared OMS state from MongoDB.
- `PUT /api/state` - Persist the shared OMS state.
- `POST /api/reset-seed` - Reset seeded data only when `ALLOW_SEED_RESET=true`.

## Included Workflows

- Account-based login for admin, dealer, and retailer roles
- Dealer/retailer registration and approval handling
- Catalog browsing with tier-specific pricing
- Cart, MOQ validation, GST totals, and order submission
- Admin order lifecycle, edit/version history, invoice and shipping label print views
- Catalog, customer master, reports, notifications, and admin user management
