# Cheapflix Nepal - Full Project Setup

## Project Structure
\
```
cheapflix-nepal/
├── backend/                    # Node.js + Express Backend
│   ├── config/                # Configuration files
│   │   └── database.js        # Prisma database setup
│   ├── controllers/           # Business logic
│   │   └── authController.js  # Authentication logic
│   ├── routes/               # API routes
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── providerRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/           # Express middleware
│   │   └── auth.js           # Authentication middleware
│   ├── prisma/              # Prisma ORM
│   │   └── schema.prisma    # Database schema
│   ├── uploads/             # File uploads directory
│   ├── .env                 # Environment variables
│   ├── .env.example         # Example environment file
│   ├── package.json         # Dependencies
│   └── server.js            # Express server entry point
│
├── frontend/                 # Frontend (HTML/CSS/JS)
│   ├── pages/              # HTML pages
│   │   ├── index.html          # Landing page
│   │   ├── login.html          # Login page
│   │   ├── register.html       # Registration page
│   │   ├── dashboard.html      # User dashboard
│   │   ├── provider-dashboard.html    # Provider dashboard
│   │   ├── admin-dashboard.html       # Admin dashboard
│   │   └── booking-flow.html   # Booking flow (moved from folder/)
│   ├── css/                # Stylesheets
│   │   ├── style.css           # Global styles
│   │   ├── landing.css         # Landing page styles
│   │   ├── auth.css            # Auth pages styles
│   │   ├── dashboard.css       # Dashboard styles
│   │   ├── provider-dashboard.css
│   │   └── admin-dashboard.css
│   ├── js/                 # JavaScript
│   │   └── auth.js             # Authentication utilities
│   └── images/             # Images directory
│
└── docs/                   # Documentation

```

