# FoodRescue

FoodRescue is a Next.js food donation prototype. Donors can enter a pickup location, food type, quantity, and expected expiry before selecting an NGO and broadcasting a request.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Create the SQLite database and apply migrations with `npm run db:migrate`.
4. Start the app with `npm run dev`.

The SQLite database is stored at `prisma/dev.db` and is excluded from version control. Run `npm run db:migrate` after updating to apply new schema migrations. Use `npm run db:studio` to inspect saved donations and NGO accounts. NGOs sign in at `/login` and are sent to `/ngo/dashboard`, where active donor broadcasts refresh every 15 seconds. The dashboard can also request optional browser notifications.

Administrators sign in at `/admin/login`. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD` (use a unique password of at least 12 characters), and `NGO_SESSION_SECRET` in `.env`; the admin password is read from the environment and is not stored in the database. Use a unique session secret of at least 32 random bytes in production. The admin dashboard provides regional request/status summaries, request filtering, and NGO account creation, region assignment, and activation controls. Donation regions are entered by donors at broadcast time, so regional analytics depend on accurate region values.

The floating AI assistant uses Google's Gemini Developer API. Create your own API key in [Google AI Studio](https://aistudio.google.com/apikey), then add it to the server-only `GEMINI_API_KEY` variable in `.env`; the default model is `gemini-3.8-flash` (`GEMINI_MODEL` can override it). Never prefix the key with `NEXT_PUBLIC_` or expose it in client code. Google lists free text input/output for this model on the free tier, subject to availability and rate limits; free-tier prompts may be used to improve Google's products. Live Google Search grounding is not available on the free tier for this model, so the assistant can answer general questions from model knowledge but cannot guarantee up-to-date answers or provide live-search citations. Check Google's current pricing and terms before use. Without a configured key, chat is disabled and the setup message is shown.

NGO-only endpoints are `GET /api/ngo-requests` and `POST /api/ngo-requests/:id/accept`; admin endpoints are protected by the admin session and live under `/api/admin`. Authentication endpoints are `/api/ngo-auth/{register,login,logout}` and `/api/admin-auth/{login,logout}`.

## Modular MVC Architecture

The application has been restructured with clear `frontend/` and `backend/` separation and modular MVC design:

```
food-secure/
├── frontend/
│   ├── models/                # Frontend types, data interfaces & schemas
│   │   ├── donation/          # DonationFoodItem, DonationBroadcastRequest, etc.
│   │   ├── ngo/               # NgoItem, NgoRequestItem, etc.
│   │   ├── admin/             # AdminNgoAccount, AdminDashboardPayload, etc.
│   │   └── ai/                # ChatMessage, ChatApiResponse, etc.
│   ├── controllers/           # Client hooks & state controllers
│   │   ├── donation/          # useDonationController (form state, geolocation, broadcast)
│   │   ├── ngo/               # useNgoController (polling, accept/decline, status)
│   │   ├── admin/             # useAdminController (dashboard analytics, filtering)
│   │   └── ai/                # useHelpController (Gemini assistant chat state)
│   └── views/                 # Presentation views and UI screens
│       ├── donation/          # DonationCardView, SelectNgoView, HeroSectionView, etc.
│       ├── ngo/               # NgoDashboardView, NgoAuthView, NgoSelectionView, etc.
│       ├── admin/             # AdminDashboardView, AdminLoginFormView, etc.
│       ├── ai/                # HelpChatbotView
│       └── shared/            # SiteHeaderView
│
├── backend/
│   ├── config/                # Database and auth config
│   │   └── database.ts        # Prisma client instance
│   ├── models/                # Data queries & persistence (M in MVC)
│   │   ├── donation/          # DonationModel
│   │   ├── ngo/               # NgoModel
│   │   └── admin/             # AdminModel
│   ├── views/                 # Response serialization & formatting (V in MVC)
│   │   ├── donation/          # DonationView
│   │   ├── ngo/               # NgoView
│   │   └── admin/             # AdminView
│   └── controllers/           # Business logic & route handlers (C in MVC)
│       ├── donation/          # DonationController
│       ├── ngo/               # NgoAuthController, NgoRequestController
│       ├── admin/             # AdminAuthController, AdminDashboardController
│       ├── ai/                # HelpController (Gemini AI assistant)
│       └── location/          # LocationController (reverse geocoding)
│
└── app/                       # Thin Next.js router layer
    ├── api/                   # Thin API route handlers delegating to backend/controllers
    └── ...                    # Page routes rendering frontend/views
```

The six nearby NGO listings and acceptance action are sample data/actions. NGO accounts use scrypt-hashed passwords and signed HTTP-only session cookies, but organization identity is not independently verified. Donation records, NGO accounts, and broadcast status are persisted in SQLite.