# PropManage - Property Management Web Application

A complete, production-ready property management platform with separate **User Website** and **Admin Panel**, connected via a Node.js + Express backend with MongoDB database.

---

## Project Structure

```
PMA/
├── server/              # Node.js + Express Backend API
│   ├── config/          # Database configuration
│   ├── models/          # MongoDB Mongoose models
│   ├── routes/          # API route handlers
│   ├── middleware/       # Auth & upload middleware
│   ├── uploads/         # File storage (auto-created)
│   ├── server.js        # Main server entry point
│   └── .env             # Environment variables
├── client-user/         # User-facing React Website (port 3000)
│   └── src/
│       ├── pages/       # Home, Properties, Detail, Auth, Dashboard...
│       ├── components/  # Navbar, Footer, PropertyCard, WhatsApp...
│       ├── context/     # Auth Context
│       └── api/         # Axios instance
├── client-admin/        # Admin Panel React App (port 3001)
│   └── src/
│       ├── pages/       # Dashboard, Properties, Users, Reports...
│       ├── components/  # AdminLayout, Sidebar
│       └── context/     # Admin Auth Context
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6 |
| Styling | Custom CSS (no framework needed) |
| State Management | React Context API |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Authentication | JWT (JSON Web Tokens) |
| Real-time | Socket.io |
| File Upload | Multer |
| Charts | Recharts |
| Notifications | react-hot-toast |

---

## Prerequisites

- **Node.js** 18+ installed
- **MongoDB** running locally (or MongoDB Atlas URI)
- **npm** or **yarn**

---

## Installation & Setup

### Step 1: Clone / Download
```bash
cd "c:\Users\ashu2\OneDrive\Desktop\PMA"
```

### Step 2: Install all dependencies
```bash
# Install server dependencies
cd server && npm install && cd ..

# Install user client dependencies
cd client-user && npm install && cd ..

# Install admin client dependencies
cd client-admin && npm install && cd ..
```

### Step 3: Configure Environment
The `.env` file in `/server` is pre-configured for local development:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/property_management
JWT_SECRET=pma_super_secret_jwt_key_2024_change_in_production
JWT_EXPIRE=7d
CLIENT_USER_URL=http://localhost:3000
CLIENT_ADMIN_URL=http://localhost:3001
```

### Step 4: Start MongoDB
```bash
# Windows - start MongoDB service
net start MongoDB
# or run: mongod
```

### Step 5: Start all services (3 terminals)

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 - User Website:**
```bash
cd client-user
npm start
# Opens at http://localhost:3000
```

**Terminal 3 - Admin Panel:**
```bash
cd client-admin
npm start
# Opens at http://localhost:3001
```

---

## First Time Setup - Admin Account

1. Open Admin Panel: `http://localhost:3001`
2. Click Login - enter **any email and password**
3. First login auto-creates the Super Admin account
4. Use those same credentials for all future logins

---

## Key Features

### User Website (localhost:3000)
- Hero section with property search
- Property listings with advanced filters
- Property detail page with image gallery
- Book property visits
- UPI QR payment submission
- User dashboard with bookings & favorites
- Reviews and ratings
- Contact/inquiry form
- WhatsApp floating button
- Fully responsive mobile design

### Admin Panel (localhost:3001)
- Dashboard with real-time charts and stats
- Full property CRUD with image upload
- Manage bookings (confirm/reject/complete)
- Verify payments
- User management (block/unblock/delete)
- Respond to inquiries
- Delete reviews
- CMS for dynamic website content
- Reports & analytics with charts
- Real-time notifications via Socket.io

---

## API Documentation

### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | User login |
| GET | `/auth/me` | Get current user |
| POST | `/admin/login` | Admin login |
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/properties` | List properties (filterable) |
| POST | `/properties` | Create property (admin) |
| PUT | `/properties/:id` | Update property (admin) |
| DELETE | `/properties/:id` | Delete property (admin) |
| POST | `/bookings` | Create booking |
| GET | `/bookings/my` | User's bookings |
| POST | `/payments` | Submit payment |
| POST | `/inquiries` | Submit inquiry |
| POST | `/reviews` | Add review |
| GET | `/cms` | Get CMS content |

---

## Database Collections

- **users** - Registered users
- **admins** - Admin accounts
- **properties** - Property listings
- **categories** - Property categories
- **bookings** - Visit/booking requests
- **payments** - Payment transactions
- **reviews** - Property reviews
- **notifications** - User & admin notifications
- **inquiries** - Contact & property inquiries
- **cms** - Dynamic website content

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| PORT | Server port (default: 5000) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | Secret key for JWT tokens |
| JWT_EXPIRE | Token expiry duration |
| CLIENT_USER_URL | User website URL (for CORS) |
| CLIENT_ADMIN_URL | Admin panel URL (for CORS) |

---

## Deployment

### Build for Production
```bash
# Build user website
cd client-user && npm run build

# Build admin panel
cd client-admin && npm run build

# Set NODE_ENV=production in server/.env
```

### Production Checklist
- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use MongoDB Atlas URI instead of local MongoDB
- [ ] Set up proper CORS origins
- [ ] Enable HTTPS
- [ ] Configure file storage (AWS S3 or Cloudinary)

---

## Support

For issues or questions, contact: ashrithaduppati2@gmail.com
