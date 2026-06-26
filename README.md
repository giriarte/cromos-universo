# Universo Cromos

An online marketplace for collectible trading cards and sticker albums. Buyers browse a paginated catalog, add items to a timed cart with real-time stock reservation, and complete purchases via MercadoPago. An admin panel handles the full order lifecycle, inventory, and user management.

**Live site:** [cromos-universo.com](https://www.cromos-universo.com)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | NextAuth v5 with Supabase adapter |
| Payments | MercadoPago (webhook-verified) |
| Storage | AWS S3 (presigned URL uploads, lifecycle policies) |
| Email | AWS SES (transactional order emails) |
| Rate limiting | Upstash Redis (sliding window) |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod |
| Testing | Vitest + React Testing Library |
| Deployment | AWS Amplify |

---

## Key Features

**Store**
- Paginated catalog with category filtering
- Real-time stock reservation — stock is decremented on add-to-cart, not on checkout
- Multi-tab session tracking: stock is restored via `navigator.sendBeacon` when the last tab closes
- Timed cart reservation with countdown
- Waitlist support for out-of-stock items
- MercadoPago checkout with IP validation and webhook payment confirmation
- Transactional order confirmation emails via AWS SES
- Email verification flow for buyers

**Admin panel** (role-based: superadmin / editor)
- Article management with multi-image upload to S3
- Category management with inline editing
- Order lifecycle tracking (pending → confirmed → shipped / cancelled)
- Automatic cancellation of expired orders with stock restoration
- User management (create, delete, assign roles)

---

## Architecture Notes

- **Stock consistency**: Cart operations call a server-side API route that uses Supabase RPC (`decrement_stock`, `increment_stock`) to atomically update stock. This prevents overselling under concurrent requests.
- **Image uploads**: The client requests a presigned S3 URL from the API, then uploads directly to S3 from the browser. The server never handles the binary.
- **Rate limiting**: All API routes and the checkout flow are protected by Upstash Redis sliding-window rate limiters via Next.js middleware.
- **Auth**: Admin users are stored in a separate `admin_users` table with bcrypt-hashed passwords and role-based access enforced at the layout level.

---

## Getting Started

### Prerequisites

- Node.js 22+
- A [Supabase](https://supabase.com) project
- An [Upstash Redis](https://upstash.com) database
- AWS account with S3 bucket and SES sender identity verified
- [MercadoPago](https://www.mercadopago.com) developer account

### Environment Variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# AWS (S3 + SES share credentials)
APP_AWS_REGION=
APP_AWS_ACCESS_KEY_ID=
APP_AWS_SECRET_ACCESS_KEY=
APP_S3_BUCKET=
APP_SES_REGION=        # optional — defaults to APP_AWS_REGION
SES_FROM_EMAIL=

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=

# Upstash Redis — fromEnv() reads these automatically
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### Running Locally

```bash
npm install
npm run dev
```

### Seed Admin User

```bash
npm run seed-admin
```

### Running Tests

```bash
npm test
```

Unit tests covering all admin UI components (forms, delete flows, inline editing, navigation, order status management).

---

## Deployment

The project deploys to AWS Amplify. Build configuration is in [`amplify.yml`](amplify.yml).

```bash
# Production build
npm run build
```

---

## Development Approach

Built end-to-end as a solo project using Claude and agentic workflows (Claude Code) as the primary engineering model — spanning design decisions, implementation, debugging, test authoring, and documentation. This AI-native workflow compressed the time from idea to production significantly.
