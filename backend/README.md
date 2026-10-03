# NimuFly Visa Platform — Production Backend

A production-oriented, scalable modular monolith REST API built with Node.js, Express.js, and MongoDB / Mongoose for the Nimufly Visa Platform.

---

## 🏗 Architecture & Layering

The codebase strictly adheres to a clean separation of concerns:

```
Request 
  │
  ▼
[Route]           → Receives HTTP requests and maps them to controllers
  │
  ▼
[Middleware]      → Authenticates JWT, authorizes roles, validates payload (Joi), rate limits
  │
  ▼
[Controller]      → Extracts inputs, invokes service layer, standardizes HTTP response
  │
  ▼
[Service]         → Executes core business logic, calculates verified pricing, generates signed URLs
  │
  ▼
[Model / DB]      → Defines Mongoose schemas, indexes, soft-deletes, and queries MongoDB
```

### Directory Structure
```
backend/
├── src/
│   ├── config/             # Database connection, environment variables, storage clients
│   │   ├── database.js
│   │   ├── environment.js
│   │   └── storage.js
│   ├── constants/          # Role definitions, application lifecycles, audit action enums
│   │   ├── roles.js
│   │   └── statuses.js
│   ├── controllers/        # HTTP Request / Response orchestrators
│   │   ├── admin.controller.js
│   │   ├── application.controller.js
│   │   ├── auth.controller.js
│   │   ├── country.controller.js
│   │   ├── document.controller.js
│   │   ├── health.controller.js
│   │   ├── payment.controller.js
│   │   └── visa.controller.js
│   ├── middleware/         # Security, JWT auth, RBAC authorization, Joi validator, error handler
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   ├── security.middleware.js
│   │   └── validate.middleware.js
│   ├── models/             # Mongoose schemas with indexes, virtuals, and JSON transforms
│   │   ├── Application.js
│   │   ├── AuditLog.js
│   │   ├── Country.js
│   │   ├── Document.js
│   │   ├── Payment.js
│   │   ├── RefreshToken.js
│   │   ├── User.js
│   │   └── Visa.js
│   ├── routes/             # REST route declarations under /api/v1/
│   │   ├── admin.routes.js
│   │   ├── application.routes.js
│   │   ├── auth.routes.js
│   │   ├── country.routes.js
│   │   ├── document.routes.js
│   │   ├── index.js
│   │   ├── payment.routes.js
│   │   └── visa.routes.js
│   ├── scripts/            # Database seeding and Excel database migration
│   │   ├── migrateExcel.js
│   │   └── seed.js
│   ├── services/           # Business logic, pricing engine, audit logging, file storage
│   │   ├── application.service.js
│   │   ├── audit.service.js
│   │   ├── auth.service.js
│   │   ├── country.service.js
│   │   ├── document.service.js
│   │   ├── payment.service.js
│   │   ├── storage.service.js
│   │   └── visa.service.js
│   ├── utils/              # Structured logger, ApiError, ApiResponse, asyncHandler
│   │   ├── apiError.js
│   │   ├── apiResponse.js
│   │   ├── asyncHandler.js
│   │   └── logger.js
│   ├── validators/         # Joi validation schemas for incoming requests
│   │   ├── application.validator.js
│   │   ├── auth.validator.js
│   │   ├── country.validator.js
│   │   ├── payment.validator.js
│   │   └── visa.validator.js
│   ├── app.js              # Express app configuration & middleware pipeline
│   └── server.js           # Server entry point with graceful shutdown
├── package.json
└── README.md
```

---

## 🔐 Core Features & Design Principles

### 1. Authentication & Role-Based Authorization
- **Access / Refresh Token Pair**: Access tokens are short-lived (`15m`), verified stateless via JWT. Refresh tokens (`7d`) are stored in MongoDB with a TTL index for automated expiry and token rotation on use.
- **Bcrypt Hashing**: Passwords hashed with 12 salt rounds before persisting to MongoDB.
- **Extensible RBAC**: Initially ships with `CUSTOMER` and `ADMIN` roles. Role hierarchy is defined in `constants/roles.js` allowing seamless future additions (`SUPER_ADMIN`, `VISA_OPERATOR`, `FINANCE`, `SUPPORT`) without altering application routes.

### 2. Frozen Pricing Snapshot
- **Never Trust the Client**: When creating an application or payment, the payable amount is calculated server-side from `Visa.governmentFee + Visa.serviceFee` multiplied by `travellerCount`.
- **Permanent Immutable Snapshot**: Stored in `Application.pricingSnapshot`. If an administrator subsequently alters visa pricing in the database, existing submitted applications remain completely unaffected.

### 3. Secure Private Object Storage
- Files (passport scans, photographs, tickets) are **never** stored as BLOBs in MongoDB.
- MongoDB only stores the `storageKey` reference and file metadata.
- Pre-signed temporary URLs (expiring in 15 minutes) are generated for authorized downloads.
- Works with Cloudflare R2 / AWS S3, and provides a tokenized local file fallback for offline/development environments.

### 4. Payment Gateway (Razorpay & Webhooks)
- Generates backend-verified orders.
- Cryptographic HMAC-SHA256 signature verification.
- Webhook processor for asynchronous status callbacks with idempotency.
- Built-in Mock provider mode for development without live payment credentials.

### 5. Audit Logging
Tracks all administrative and lifecycle operations:
- Status changes
- Pricing adjustments
- Document verifications & rejections
- Visa and country modifications
- Records `actor`, `action`, `entity`, `previousValues`, `newValues`, `ipAddress`, and `userAgent`.

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Create a `.env` file in the `backend/` directory with your local configuration:
```bash
touch .env
```

Ensure your MongoDB instance is running locally or provide a connection URI:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_uri
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
```

### 3. Seed Database & Migrate Excel
Run the automated seed script to import all 27 visa offerings from `NimuFly_Visa_Database.xlsx` and create initial admin and customer accounts:
```bash
npm run seed
```

Default credentials seeded (configured via environment variables):
- **Admin**: `admin@nimufly.com` (configured via DEFAULT_ADMIN_PASSWORD in .env)
- **Sample Customer**: `rahul.sharma@example.com` (configured in local development environment)

### 4. Run Development Server
```bash
npm run dev
```

---

## 📡 REST API Reference (`/api/v1`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/v1/health` | Public | System status, database connection, uptime |
| **POST** | `/api/v1/auth/register` | Public | Register customer account |
| **POST** | `/api/v1/auth/login` | Public | Authenticate user & return token pair |
| **POST** | `/api/v1/auth/refresh` | Public | Rotate refresh token & obtain new access token |
| **POST** | `/api/v1/auth/logout` | Public | Revoke active refresh token |
| **GET** | `/api/v1/auth/me` | Authenticated | Fetch current profile |
| **PUT** | `/api/v1/auth/me` | Authenticated | Update personal profile |
| **GET** | `/api/v1/countries` | Public | List active countries (query, pagination) |
| **GET** | `/api/v1/countries/:idOrSlug` | Public | Get single country with its visas |
| **POST** | `/api/v1/countries` | Admin | Create country |
| **PUT** | `/api/v1/countries/:id` | Admin | Update country metadata |
| **PATCH** | `/api/v1/countries/:id/status` | Admin | Toggle country active status |
| **DELETE** | `/api/v1/countries/:id` | Admin | Soft-delete country |
| **GET** | `/api/v1/visas` | Public | List active visas (filter by country, visaType, category) |
| **GET** | `/api/v1/visas/:idOrSlug` | Public | Get single visa details |
| **POST** | `/api/v1/visas` | Admin | Create visa offering |
| **PUT** | `/api/v1/visas/:id` | Admin | Update visa details and pricing |
| **PATCH** | `/api/v1/visas/:id/status` | Admin | Toggle visa active status |
| **DELETE** | `/api/v1/visas/:id` | Admin | Soft-delete visa |
| **POST** | `/api/v1/applications` | Public / Customer | Submit new application with frozen pricing |
| **GET** | `/api/v1/applications` | Customer / Admin | List applications (paginated, search, status filter) |
| **GET** | `/api/v1/applications/:idOrRef` | Customer / Admin | Get application details by ID or reference (`MV-######`) |
| **PATCH** | `/api/v1/applications/:id` | Admin | Update status, admin message, required action |
| **POST** | `/api/v1/applications/:id/actions` | Customer | Re-upload missing documents for review |
| **POST** | `/api/v1/documents` | Public / Customer | Multipart file upload (stored in R2/S3) |
| **GET** | `/api/v1/documents/:id/signed-url` | Customer / Admin | Generate pre-signed temporary download URL |
| **PATCH** | `/api/v1/documents/:id/status` | Admin | Verify or request re-upload for document |
| **POST** | `/api/v1/payments/initialize` | Public / Customer | Create order verified from backend snapshot |
| **POST** | `/api/v1/payments/verify` | Public / Customer | Verify gateway signature & credit payment |
| **POST** | `/api/v1/payments/webhook` | Webhook | Razorpay webhook callback |
| **GET** | `/api/v1/admin/dashboard-stats` | Admin | Retrieve operational KPIs |
| **GET** | `/api/v1/admin/audit-logs` | Admin | Retrieve audit trail by entity |

---

## 🚢 Production Deployment

The backend is built as a production-grade 12-factor application:
- Set `NODE_ENV=production`
- Configure `CLIENT_URL` to your production frontend domain (e.g. `https://nimufly.com`)
- Configure `MONGODB_URI` (e.g. MongoDB Atlas cluster)
- Deploy seamlessly to **Render**, **Railway**, **AWS App Runner / ECS**, or **DigitalOcean App Platform**.
