# ShopSphere — Advanced Full-Stack Fashion E-Commerce Platform

ShopSphere is an advanced, production-oriented fashion retail platform engineered with React, Vite, Node.js, Express, MongoDB Atlas, and Razorpay. It features an editorial aesthetic inspired by modern luxury publications, combining high-fashion visual storytelling with enterprise-grade e-commerce capabilities.

---

## 🏛️ System Documentation Suite

All system specifications and design artifacts are maintained in the [`docs/`](file:///d:/shopsphere/docs/) directory:

1. [**Requirements & Acceptance Criteria**](file:///d:/shopsphere/docs/requirements.md) — Scope, user personas, roles (`customer`, `admin`), detailed acceptance criteria, page map, and business logic.
2. [**System Architecture & Topology**](file:///d:/shopsphere/docs/architecture.md) — Decoupled client-server design, security pipeline, Razorpay/Cloudinary integration flows, and reliability principles.
3. [**Database Schema Design**](file:///d:/shopsphere/docs/database-design.md) — 9 Mongoose data models, indexes, compound keys, ER diagram, and state machine transition rules.
4. [**RESTful API Specification**](file:///d:/shopsphere/docs/api.md) — Exhaustive documentation of all `/api/v1` endpoints, validation schemas, and error registry.
5. [**Editorial Fashion Design System**](file:///d:/shopsphere/docs/design-system.md) — Color tokens (ivory, charcoal ink, sand, sage), typography scale, UI component blueprints, and accessibility standards.
6. [**Testing & QA Strategy**](file:///d:/shopsphere/docs/testing.md) — Test pyramid, mandatory test scenarios, and automated verification protocols.
7. [**Deployment & Operations Guide**](file:///d:/shopsphere/docs/deployment.md) — Vercel + Render + Atlas deployment steps, environment templates, and production hardening.
8. [**Phase 1 Completion Checklist**](file:///d:/shopsphere/docs/phase-1-checklist.md) — Verification of all Phase 1 deliverables and architecture decision log.

---

## 🛠️ Technology Stack

* **Frontend:** React 18+, Vite, JavaScript (ES modules), Tailwind CSS, React Router v6, Axios, TanStack Query, Zustand, React Hook Form, Zod, Lucide React.
* **Backend:** Node.js, Express.js, MongoDB Atlas (Mongoose ODM), Zod, bcrypt/Argon2id, HTTP-only Cookie JWT Auth, Helmet, Express Rate Limit, CORS.
* **External Services:** Razorpay (Test & Live modes), Cloudinary (Image management).
* **Testing & Tooling:** Vitest, React Testing Library, Supertest, ESLint, Prettier.

---

## 📂 Monorepo Structure

```
shopsphere/
├── client/           # React + Vite frontend application
├── server/           # Express + MongoDB backend application
├── docs/             # Technical specifications and design system
├── .gitignore        # Monorepo git ignore rules
├── package.json      # Monorepo workspace configuration
└── README.md         # Repository overview
```

---

## 🚀 Development Phases

* **Phase 1: Requirements, Architecture & Design System** — ✅ COMPLETED
* **Phase 2: Project Setup & Baseline Scaffolding** — ⏳ READY TO BEGIN
* **Phase 3: Backend Foundation & Authentication** — 📅 Upcoming
* **Phase 4: Product Catalog & Multi-Variant Matrix** — 📅 Upcoming
* **Phase 5: Customer Accounts, Cart & Wishlist** — 📅 Upcoming
* **Phase 6: Checkout, Pricing Engine & Razorpay** — 📅 Upcoming
* **Phase 7: Administrative Dashboard & Fulfillment** — 📅 Upcoming
* **Phase 8: QA Automation, Linting & Hardening** — 📅 Upcoming
* **Phase 9: Production Deployment & Handover** — 📅 Upcoming
