# HotelPro — Hotel Management Website

A full-stack hotel booking and management web application built as a college project.

**Stack:** React 18 + Vite 5 (frontend) · Node.js + Express (backend) · MongoDB Atlas (database)  
**Hosting:** Vercel (frontend, free tier) · Render (backend, free tier)

---

## Features

| Feature | Details |
|---|---|
| Homepage | Hero, features, featured rooms, testimonials, CTA |
| Room listing | All rooms with type filter (Standard / Deluxe / Suite / Presidential) |
| Room detail | Full description, amenities, policies, sticky booking card |
| Booking form | Guest info, dates, guests, special requests + full client-side validation |
| Booking confirmation | Reference number, full summary, demo payment badge |
| Booking lookup | Search any booking by reference code |
| Admin dashboard | Stats cards, bookings table, status management, room seeding |
| Responsive design | Mobile, tablet, and desktop layouts |
| Loading / error states | Spinners, alerts, empty states on every data-fetching view |

> ⚠️ **Demo project** — No real payments are processed. All bookings show "DEMO PAID" status.

---

## Project Structure

```
hotelpro/
├── backend/
│   ├── config/         db.js (MongoDB connection)
│   ├── controllers/    roomController, bookingController, adminController
│   ├── middleware/     auth.js (JWT protect)
│   ├── models/         Room, Booking, Admin
│   ├── routes/         roomRoutes, bookingRoutes, adminRoutes
│   ├── server.js
│   ├── render.yaml     Render deployment config
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/        axios.js, rooms.js, bookings.js, admin.js
    │   ├── components/ Navbar, Footer, RoomCard, Alert, Spinner, …
    │   ├── context/    AdminAuthContext
    │   ├── pages/      Home, Rooms, RoomDetail, Booking, Confirmation,
    │   │               BookingLookup, AdminLogin, AdminDashboard, NotFound
    │   └── styles/     global.css
    ├── vercel.json     Vercel SPA rewrite rule
    └── .env.example
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A MongoDB Atlas free cluster (or local MongoDB)

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/hotelpro.git
cd hotelpro
```

### 2. Set up the backend
```bash
cd backend
cp .env.example .env        # fill in your values (see below)
npm install
npm run dev                 # starts on http://localhost:5000
```

**`backend/.env`**
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/hotelpro?retryWrites=true&w=majority
JWT_SECRET=any_long_random_string_here
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
```

### 3. Seed sample rooms
Once the backend is running, hit this endpoint once to populate rooms:
```
POST http://localhost:5000/api/admin/seed
```
Using curl:
```bash
curl -X POST http://localhost:5000/api/admin/seed
```
Or open the URL in Postman / Thunder Client.

### 4. Create an admin account
Connect to your MongoDB Atlas cluster and insert one document into the `admins` collection:
```json
{
  "name": "Admin",
  "email": "admin@hotelpro.com",
  "password": "$2a$10$..."
}
```
> The password must be a **bcrypt hash**. The easiest way is to run this one-liner:
```bash
node -e "const b=require('bcryptjs');b.hash('password123',10).then(h=>console.log(h))"
```
Run it inside `backend/` (bcryptjs is already installed). Copy the hash into MongoDB Atlas.

### 5. Set up the frontend
```bash
cd ../frontend
cp .env.example .env.local  # already set to localhost:5000
npm install
npm run dev                 # starts on http://localhost:5173
```

---

## Deployment

### A. Deploy the backend to Render (free web service)

1. Push your repo to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo, select the **`backend`** folder as root directory.
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
5. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A long random secret |
| `CLIENT_URL` | Your Vercel frontend URL (set after Vercel deploy) |
| `NODE_ENV` | `production` |

6. Click **Deploy**. Render will give you a URL like `https://hotelpro-api.onrender.com`.
7. Test the health check: `https://hotelpro-api.onrender.com/health`

> **Free tier cold start:** Render free services spin down after 15 min of inactivity and take ~30–50 seconds to wake up on the next request. The frontend shows a "Request timed out. The server may be waking up — please retry." message during this time. This is expected behaviour on the free tier.

### B. Deploy the frontend to Vercel (Hobby free tier)

1. Go to [vercel.com](https://vercel.com) → **New Project**.
2. Import your GitHub repo.
3. Set the **Root Directory** to `frontend`.
4. Framework preset: **Vite**
5. Settings:
   - **Install command:** `npm install`
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
6. Add this **Environment Variable**:

| Key | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL, e.g. `https://hotelpro-api.onrender.com` |

7. Click **Deploy**. Vercel gives you a URL like `https://hotelpro.vercel.app`.

### C. Update CORS on the backend

After you have the Vercel URL, go back to Render → your service → **Environment** and update:
```
CLIENT_URL = https://hotelpro.vercel.app
```
Render will redeploy automatically.

### D. Seed rooms on production

Call the seed endpoint once on the deployed backend:
```
POST https://hotelpro-api.onrender.com/api/admin/seed
```
This is a no-op if rooms already exist.

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| GET | `/api/rooms` | None | List rooms (optional `?type=Deluxe`) |
| GET | `/api/rooms/:id` | None | Single room |
| POST | `/api/bookings` | None | Create booking |
| GET | `/api/bookings/reference/:ref` | None | Look up booking |
| POST | `/api/admin/login` | None | Admin sign-in → JWT |
| POST | `/api/admin/seed` | None | Seed sample rooms (no-op if exist) |
| GET | `/api/admin/dashboard` | JWT | Stats |
| GET | `/api/admin/bookings` | JWT | All bookings |
| PATCH | `/api/admin/bookings/:id/status` | JWT | Update status |
| POST | `/api/admin/rooms` | JWT | Create room |
| PUT | `/api/admin/rooms/:id` | JWT | Update room |
| DELETE | `/api/admin/rooms/:id` | JWT | Delete room |

---

## Free-Tier Compliance Checklist

- [x] MongoDB Atlas free shared cluster (M0) — 512 MB storage
- [x] Render free web service — 750 hours/month
- [x] Vercel Hobby tier — unlimited bandwidth for personal projects
- [x] No paid APIs, no Redis, no paid image hosting
- [x] No real payment processing — demo status only
- [x] `.env` files are in `.gitignore` — no secrets committed
- [x] No secrets hardcoded in frontend code
- [x] Rate limiting on API (200 req / 15 min)
- [x] Optimised CSS-only images (gradients) — no external image CDN needed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Axios, Vite 5 |
| Styling | Custom CSS (no frameworks), Google Fonts |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB Atlas (free M0 cluster) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Security | express-rate-limit, CORS whitelist, dotenv |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Known Limitations (Free Tier)

1. **Backend cold starts** — Render free services hibernate after inactivity. First request after sleep takes 30–50 s. Users see a friendly retry message.
2. **No file uploads** — Room images use CSS gradients. Adding real image uploads would require a free Cloudinary account (not included to stay minimal).
3. **Admin account creation** — Requires a one-time MongoDB Atlas manual insert. There is no self-registration UI to keep the project secure.
4. **No email confirmations** — Would require an email service (e.g. SendGrid free tier). Not included to avoid additional third-party dependencies.

---

*College project · Built with React, Node.js, Express, and MongoDB Atlas*
