2026-11-03_22-55-56.heic2026-11-03_22-56-22.heic# AIQ HireFlow
## Advanced Software Requirements Specification & Development Blueprint

**Project:** AIQ Equipment Rental, Inventory & Operations Management System  
**Product name:** AIQ HireFlow  
**Product descriptor:** Equipment Rental, Inventory & Business Operations  
**Company:** AIQ Limited / AIQ Unlimited Solutions (confirm exact registered display name before production)  
**Website reference:** https://www.aiqltd.co.tz/  
**Document version:** 1.0  
**Date:** 03 November 2026  
**Status:** Product and engineering blueprint  
**Primary users:** Admin and Staff  
**Primary currency:** Tanzanian Shilling (TZS)  
**Primary timezone:** Africa/Dar_es_Salaam  
**Initial language:** English, with architecture ready for Swahili localization

---

# 1. Product vision

AIQ HireFlow is a centralized web-based system for managing the complete lifecycle of equipment owned or managed by AIQ Limited. It replaces paper-based machine-hire cards, disconnected stock records, manual payment calculations and scattered customer information with one auditable source of truth.

The system must let AIQ:

1. Register equipment categories, models and individual physical assets.
2. Know exactly what equipment exists, where it is, its condition and whether it is available.
3. Register customers, contacts, locations and guarantors where required.
4. Prepare rental quotations and rental agreements.
5. Check equipment availability for requested rental dates.
6. Agree standard or negotiated prices with an approval workflow.
7. Dispatch equipment and record its condition, accessories, photographs and handover staff.
8. Track active, due, overdue, extended and returned rentals.
9. Receive equipment, inspect it and route it to available, inspection or maintenance status.
10. Record full, partial, deposit and additional payments.
11. Generate professional invoices, receipts, statements and rental documents.
12. Track expenses, maintenance costs, outstanding balances and operational performance.
13. Provide management dashboards and reliable reports.
14. Maintain a complete audit trail of important actions.

This is not a simple CRUD inventory application. It is an equipment rental operations platform with inventory control, rental scheduling, customer management, financial records, document generation and role-based access control.

## 1.1 Product name and brand direction

**Recommended name: AIQ HireFlow**

Why this name:
- **AIQ** keeps the product connected to the company's identity and logo.
- **Hire** immediately communicates equipment rental.
- **Flow** communicates the complete operational journey: stock → booking → dispatch → active hire → return → inspection → payment closure.
- It is short enough for a dashboard title, login screen, invoice header and future mobile application.

Recommended product lockup:

> **AIQ HireFlow**  
> Equipment Rental & Operations Management

The logo supplied by the client should be used as the primary brand asset. Do not redraw, distort, recolor or crop the logo without approval. Prepare transparent/light and dark-background variants only if the company supplies or approves them.

Alternative names, if the client does not approve AIQ HireFlow:
- AIQ HireDesk
- AIQ EquipTrack
- AIQ RentalHub

The product name is a proposed software name, not a claim that the name or trademark has been legally cleared. Confirm naming approval and trademark/domain availability before public launch.

## 1.2 Business context

The supplied machine-hire card shows the current paper process and the minimum operational fields that must be digitized:

- Rental number / RN
- Machine or equipment
- Customer
- Guarantor
- Phone number
- Location / project site
- Date and time out
- Date and time in
- Number of days
- Issued by
- Received by
- Status
- Remarks
- Payment

The sample card includes a Poker machine, a customer name, a phone number, a location, an issue date/time and the issuing staff member. These are sample records only and must not be treated as real production customer data.

The supplied equipment photograph is a visual example of a physical rental asset. The system must support photographs for any equipment type, not only Poker machines.

The product must be configurable because AIQ may rent different equipment classes and add new categories, models, pricing rules and assets over time.

---

# 2. Scope and user roles

The first release has exactly two application roles:

## 2.1 Admin

Admin is the system controller and business owner role. Admin can:
- View all dashboard metrics and business records.
- Create, edit, archive and configure equipment categories, models and assets.
- Manage stock and asset identifiers.
- Create and manage staff accounts.
- Assign staff permissions and operational limits.
- Create and approve rental quotations and agreements.
- Set standard pricing, discounts and negotiated pricing policies.
- Approve price overrides when approval is required.
- Dispatch and receive equipment, subject to operational policy.
- View and manage all invoices, payments, deposits, expenses and reports.
- Record or approve adjustments, voids, refunds and write-offs.
- Configure invoice numbering, rental numbering, payment methods, tax settings and company details.
- View audit logs.
- Configure notifications and system settings.

Admin should have full access, but destructive and financially sensitive actions must still require confirmation and be logged.

## 2.2 Staff

Staff perform day-to-day operations. Staff capabilities should be permission-driven rather than hard-coded.

Default Staff capabilities:
- View operational dashboard.
- Search and register customers.
- Create rental requests and quotations.
- Check availability.
- Create a rental using permitted pricing rules.
- Request approval for a price override.
- Record dispatch details and handover evidence.
- Record equipment returns and inspection results.
- Record payments using permitted methods.
- Generate or view invoices and receipts.
- View rental and customer history needed for their work.

Default restrictions:
- Cannot create or delete Admin accounts.
- Cannot change system-wide settings.
- Cannot permanently delete financial or rental records.
- Cannot edit historical payment amounts without an approved adjustment workflow.
- Cannot change an asset's purchase cost or default pricing unless explicitly permitted.
- Cannot approve their own price override if policy requires Admin approval.
- Cannot bypass equipment availability checks.
- Cannot mark damaged equipment as Available without inspection clearance.

## 2.3 Permission model

Use role-based access control (RBAC) with explicit permissions. The initial roles remain Admin and Staff, but permissions should be granular so the business can safely adjust staff access later.

Example permissions:
- `dashboard.read`
- `customers.read`, `customers.create`, `customers.update`, `customers.archive`
- `equipment.read`, `equipment.create`, `equipment.update`, `equipment.archive`
- `inventory.adjust`
- `rentals.read`, `rentals.create`, `rentals.update`, `rentals.cancel`
- `rentals.price_override.request`, `rentals.price_override.approve`
- `dispatch.create`, `returns.receive`, `returns.inspect`
- `payments.read`, `payments.create`, `payments.adjust`, `payments.refund`
- `invoices.read`, `invoices.issue`, `invoices.void`
- `expenses.read`, `expenses.create`, `expenses.approve`
- `reports.read`
- `staff.manage`
- `settings.manage`
- `audit.read`

Never rely only on hiding buttons in the frontend. Every protected action must be enforced by the NestJS API.

---

# 3. Technology stack

## 3.1 Frontend

Use **Next.js App Router + TypeScript + HeroUI v3**.

Required direction:
- Next.js App Router.
- React 19 or a compatible stable React version required by the selected Next.js release.
- TypeScript with strict mode.
- HeroUI **v3**, not legacy v2 patterns.
- Tailwind CSS v4.
- HeroUI styles package.
- React Hook Form for complex forms.
- Zod for client-side schema validation and shared form types where practical.
- TanStack Query for server state, caching, invalidation and mutations.
- TanStack Table only where advanced table behavior is needed; HeroUI Table may be sufficient for simpler tables.
- Lucide React for consistent line icons.
- Recharts for dashboard charts, if charting is required.
- date-fns for date formatting and calculations, with timezone-aware handling for Africa/Dar_es_Salaam.
- A typed API client generated from OpenAPI where practical.

### HeroUI version policy

Use **HeroUI v3** for this new project. Do not copy old HeroUI v2 examples into the codebase.

HeroUI v3 direction:
- React 19+.
- Tailwind CSS v4.
- `@heroui/react` and `@heroui/styles`.
- Compound component APIs.
- React Aria-based accessibility behavior.
- CSS-first theming.
- No `HeroUIProvider` requirement in the v3 setup.
- Do not add Framer Motion merely because an old v2 tutorial uses it.

At project initialization, check the official HeroUI documentation and install the latest stable compatible release. Pin dependency versions in the lockfile. Do not blindly use beta, release-candidate or canary packages in production. If the latest release is still marked pre-release at implementation time, obtain explicit technical approval before adopting it.

Official references:
- HeroUI quick start: https://heroui.com/en/docs/react/getting-started/quick-start
- HeroUI Next.js framework setup: https://heroui.com/en/docs/react/getting-started/frameworks
- HeroUI v2 → v3 migration: https://heroui.com/en/docs/react/migration
- HeroUI releases: https://heroui.com/en/docs/react/releases

### HeroUI components to use

Use HeroUI as the primary UI component system for:
- Button, ButtonGroup
- Card / Surface
- TextField, InputGroup, TextArea
- Select, ComboBox, Autocomplete
- Checkbox, CheckboxGroup, RadioGroup, Switch
- NumberField
- DatePicker, DateRangePicker, Calendar, DateField, TimeField
- Form, Fieldset, Label, Description, FieldError
- SearchField
- Table, Pagination
- Tabs
- Dropdown
- Modal / Dialog / AlertDialog
- Drawer
- Tooltip
- Badge / Chip / Tag
- Toast notifications
- Skeleton loading states
- ProgressBar / Meter
- Breadcrumbs
- Avatar
- Separator
- Empty states composed from standard components

Check each component's current v3 API before implementation. Do not assume v2 prop names or composition patterns remain valid.

## 3.2 Backend

Use **NestJS + TypeScript** as a modular monolith for the first release.

Recommended:
- NestJS latest stable compatible release.
- REST API under `/api/v1`.
- PostgreSQL as the primary relational database.
- Prisma ORM, with migrations committed to source control.
- Redis only if needed for queues, caching, rate limiting or distributed locks.
- BullMQ for background jobs if asynchronous jobs become necessary.
- OpenAPI / Swagger for API documentation.
- Pino or an equivalent structured logger.
- Zod or class-validator/class-transformer for DTO validation. Choose one consistent server-side validation approach.
- PDF generation service for invoices, receipts and rental agreements.
- S3-compatible object storage for images and generated documents.
- Docker for local development and deployment consistency.

A modular monolith is preferred over microservices at this stage. It keeps transactions and business rules easier to maintain while allowing modules to be extracted later if the product grows.

## 3.3 Database and infrastructure

- PostgreSQL: transactional business data.
- Object storage: equipment images, customer documents where allowed, dispatch/return photos, signed agreements and PDFs.
- Redis: optional cache/queue infrastructure, not the source of truth.
- HTTPS for all production traffic.
- Automated database backups and restore testing.
- Separate development, staging and production environments.
- CI checks for lint, typecheck, tests and build.

## 3.4 Suggested repository structure

Use a monorepo if the team wants shared TypeScript contracts and common tooling.

```text
aiq-hireflow/
├── apps/
│   ├── web/                         # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── admin/
│   │   │   │   ├── staff/
│   │   │   │   ├── customers/
│   │   │   │   ├── equipment/
│   │   │   │   ├── rentals/
│   │   │   │   ├── dispatch/
│   │   │   │   ├── returns/
│   │   │   │   ├── invoices/
│   │   │   │   ├── payments/
│   │   │   │   ├── expenses/
│   │   │   │   ├── reports/
│   │   │   │   ├── staff-management/
│   │   │   │   └── settings/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── tables/
│   │   │   ├── charts/
│   │   │   ├── layout/
│   │   │   └── feedback/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── equipment/
│   │   │   ├── customers/
│   │   │   ├── rentals/
│   │   │   ├── payments/
│   │   │   └── ...
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── styles/
│   └── api/                         # NestJS backend
│       └── src/
│           ├── common/
│           ├── config/
│           ├── database/
│           ├── auth/
│           ├── users/
│           ├── roles/
│           ├── permissions/
│           ├── dashboard/
│           ├── customers/
│           ├── equipment-categories/
│           ├── equipment-models/
│           ├── equipment-assets/
│           ├── inventory/
│           ├── pricing/
│           ├── rental-requests/
│           ├── rentals/
│           ├── dispatch/
│           ├── returns/
│           ├── inspections/
│           ├── maintenance/
│           ├── invoices/
│           ├── payments/
│           ├── deposits/
│           ├── expenses/
│           ├── reports/
│           ├── notifications/
│           ├── files/
│           ├── audit-logs/
│           └── settings/
├── packages/
│   ├── contracts/                   # Shared API types/schemas if appropriate
│   ├── config/                      # Shared TypeScript/lint configuration
│   └── utils/
├── infrastructure/
│   ├── docker/
│   └── deployment/
├── docs/
└── README.md
```

Keep feature code cohesive. Avoid creating one giant `components` folder containing all business logic. UI components should be reusable; domain behavior belongs in feature services and the backend.

---

# 4. Brand identity and UI design system

## 4.1 Brand principles

The interface should feel:
- Professional and trustworthy.
- Modern enterprise software.
- Clean, spacious and readable.
- Operationally efficient for staff working quickly.
- Clear when showing financial values and equipment status.
- Consistent across Admin and Staff screens.

Use the supplied AIQ logo as the source of brand recognition. The logo includes a dark background treatment, a stylized AIQ mark, a multicolored brain symbol, horizontal color bars and the “Unlimited Solutions” wordmark. Do not use every logo color throughout the UI. The interface needs a controlled palette.

## 4.2 Recommended color palette

Recommended application palette, subject to company approval:

| Token | Hex | Usage |
|---|---|---|
| AIQ Navy | `#14243A` | Sidebar, primary navigation, dark surfaces |
| AIQ Blue | `#2457A6` | Primary actions, links, selected states |
| AIQ Cyan | `#20A6B7` | Secondary highlights and charts |
| AIQ Green | `#15966A` | Available, paid, successful, healthy |
| AIQ Gold | `#E5B63B` | Attention, pending, secondary accent |
| App Background | `#F5F7FA` | Main application background |
| Surface | `#FFFFFF` | Cards, tables, forms and dialogs |
| Text Primary | `#172033` | Main text |
| Text Secondary | `#667085` | Helper text and metadata |
| Border | `#E4E8EF` | Dividers, input and card borders |
| Danger | `#D64545` | Overdue, failed, damaged, destructive actions |
| Warning | `#D97706` | Pending, due soon, requires attention |

Use semantic tokens, not raw colors scattered through components. Build CSS variables or HeroUI theme tokens for light and dark modes.

### Status colors

Status colors must always be paired with text or an icon; never communicate status using color alone.

| Status meaning | Suggested treatment |
|---|---|
| Available / Paid / Completed | Green |
| Rented / Active / In progress | Blue |
| Pending / Due soon / Awaiting approval | Amber |
| Overdue / Failed / Damaged | Red |
| Maintenance / Inspection | Purple or neutral |
| Draft / Archived / Cancelled | Gray |

## 4.3 Typography

Use a modern, highly readable font:
- **Inter** as the primary UI font.
- Use a local/self-hosted font or Next.js font optimization where permitted.
- Use tabular numerals for currency, counts and IDs.
- Use clear hierarchy: page title, section title, field label, helper text and table metadata.
- Avoid overly small text. Dense data tables must remain readable.

## 4.4 Layout system

Desktop-first operational dashboard, fully responsive for tablet and mobile.

Desktop:
- Fixed or collapsible left sidebar.
- Top header with breadcrumbs, global search, notifications and user menu.
- Main content with consistent page padding.
- Dashboard cards arranged in responsive grids.
- Data tables with filters, sorting, pagination and row actions.
- Forms arranged into logical sections rather than one extremely long unstructured page.

Tablet:
- Collapsible navigation.
- Two-column forms where space permits.
- Horizontally scrollable or responsive tables with key columns prioritized.

Mobile:
- Drawer navigation.
- Single-column forms.
- Sticky primary action where appropriate.
- Cards or compact tables for key operational lists.
- Large enough touch targets.

Recommended spacing scale: 4, 8, 12, 16, 20, 24, 32 and 40 px. Use consistent border radius and elevation; avoid excessive shadows, gradients and decorative animation.

## 4.5 Icons

Use **Lucide React** as the single icon family for the application.

Icon rules:
- Use consistent 18–20 px icons for navigation and table actions.
- Use 20–24 px icons for dashboard cards.
- Use one icon style and consistent stroke width.
- Every icon-only button must have an accessible label and tooltip.
- Do not mix random emoji with Lucide icons in the production UI.

Suggested icons:
- Dashboard: `LayoutDashboard`
- Equipment: `Package`, `Wrench`, `Boxes`
- Categories: `FolderTree`
- Customers: `Users`
- Rentals: `ClipboardList`
- Dispatch: `Truck`
- Returns: `PackageCheck`
- Payments: `Wallet`
- Invoices: `FileText`
- Reports: `ChartNoAxesCombined`
- Staff: `UserCog`
- Settings: `Settings`
- Audit: `ShieldCheck`
- Search: `Search`
- Notifications: `Bell`
- Add: `Plus`
- Edit: `Pencil`
- View: `Eye`
- Download: `Download`
- More actions: `Ellipsis`

---

# 5. Main application navigation

## 5.1 Admin navigation

```text
AIQ HireFlow
├── Overview
│   ├── Dashboard
│   └── Activity
├── Inventory
│   ├── Equipment Categories
│   ├── Equipment Models
│   ├── Equipment Assets
│   ├── Stock Overview
│   └── Asset QR Codes
├── Rental Operations
│   ├── Rental Requests
│   ├── Quotations
│   ├── All Rentals
│   ├── Active Rentals
│   ├── Dispatch / Check-out
│   ├── Returns / Check-in
│   ├── Availability Calendar
│   └── Rental History
├── Customers
│   ├── All Customers
│   └── Customer Statements
├── Maintenance
│   ├── Inspections
│   ├── Maintenance Jobs
│   └── Maintenance History
├── Finance
│   ├── Invoices
│   ├── Payments
│   ├── Security Deposits
│   ├── Expenses
│   └── Outstanding Balances
├── Reports
│   ├── Rental Reports
│   ├── Inventory Reports
│   ├── Revenue Reports
│   ├── Expense Reports
│   ├── Utilization Reports
│   └── Profitability Reports
└── Administration
    ├── Staff & Permissions
    ├── Audit Logs
    ├── Company Profile
    └── System Settings
```

## 5.2 Staff navigation

Staff should see only permitted modules:
- Dashboard
- Customers
- New Rental
- Rental Requests
- Active Rentals
- Dispatch
- Returns
- Invoices
- Payments
- Equipment lookup
- Notifications

Staff navigation must not expose admin-only settings or privileged financial controls.

---

# 6. Functional requirements by module

## 6.1 Authentication and user management

Features:
- Login with email or username and password.
- Secure password hashing using Argon2id or an appropriately configured bcrypt implementation.
- Logout and session invalidation.
- Password reset flow.
- Optional multi-factor authentication as a later security enhancement.
- Admin creates, activates, suspends and deactivates Staff accounts.
- Staff profile: full name, username/email, phone, role, status and last login.
- Session expiry and refresh strategy.
- Login rate limiting and suspicious-login logging.

Acceptance criteria:
- Unauthenticated users cannot access protected routes or API endpoints.
- Suspended users cannot create new sessions.
- Admin can deactivate a Staff account without deleting historical activity.
- Every important action records the authenticated actor.

## 6.2 Dashboard

Admin dashboard KPIs:
- Total registered equipment assets.
- Available assets.
- Rented assets.
- Reserved assets.
- Under inspection.
- Under maintenance.
- Damaged or unavailable assets.
- Active rentals.
- Rentals due today.
- Overdue rentals.
- Revenue received in selected period.
- Outstanding customer balances.
- Security deposits held.
- Expenses in selected period.
- Estimated operating result, clearly labelled.

Staff dashboard:
- My active rentals / assigned tasks if assignment is enabled.
- Rentals due today.
- Overdue rentals needing follow-up.
- Pending dispatches.
- Pending returns.
- Recent customer activity.
- Recent payments recorded by the staff member.

Dashboard behavior:
- Date range filter: today, week, month, quarter, year and custom range.
- Currency displayed as TZS with consistent formatting.
- KPI cards link to the relevant filtered list.
- Charts include accessible labels and useful empty states.
- Dashboard figures must be calculated from backend queries, not hard-coded frontend values.

## 6.3 Equipment category management

Admin can:
- Create, edit and archive categories.
- Add category name, code, description and optional image.
- Define whether assets in the category are tracked individually, by quantity, or both.
- Configure default inspection checklist templates.
- Configure category-specific fields if required.

Examples:
- Concrete Equipment
- Surveying Equipment
- Power Equipment
- Hand Tools
- Telecommunication Equipment
- Fabrication Equipment
- Other Equipment

Category creation must not require a developer or database schema change.

## 6.4 Equipment model management

An equipment model describes a type/model of equipment, not one physical unit.

Fields:
- Category.
- Equipment name.
- Brand / manufacturer.
- Model number.
- Description.
- Technical specifications.
- Default rental price rules.
- Default deposit amount or deposit policy.
- Default accessories list.
- Default return inspection checklist.
- Active / archived status.
- Optional product image.

Examples:
- Poker Vibrator — Honda — model details configurable.
- Concrete Mixer — brand/model configurable.
- Generator — capacity and power details configurable.
- Theodolite — manufacturer/model configurable.

Do not hard-code only the sample machine types.

## 6.5 Individual asset management

Each physical machine should have its own record when individual tracking is selected.

Fields:
- Asset ID, e.g. `AIQ-PK-0001`.
- Equipment model.
- Serial number (optional).
- Barcode / QR code value.
- Purchase date.
- Purchase cost.
- Supplier (optional).
- Warranty expiry (optional).
- Current location / storage location.
- Current condition.
- Operational status.
- Accessories and included components.
- Images.
- Notes.
- Created by and timestamps.

Asset status lifecycle:
- `AVAILABLE`
- `RESERVED`
- `DISPATCH_PENDING`
- `RENTED`
- `RETURN_PENDING_INSPECTION`
- `UNDER_INSPECTION`
- `MAINTENANCE`
- `DAMAGED`
- `MISSING`
- `RETIRED`
- `ARCHIVED`

Important:
- A rented asset cannot be assigned to another overlapping rental.
- A maintenance, damaged, missing, retired or archived asset cannot be dispatched.
- Asset status changes must be recorded in an inventory movement/history table.
- Never silently overwrite asset history.

## 6.6 Quantity-based stock

Some low-value accessories or bulk items may be tracked by quantity rather than individual asset.

Support two tracking modes:
1. Individually tracked assets.
2. Quantity-based stock items.

Do not mix the two models invisibly. The category/model must declare its tracking mode, and the UI must make it clear whether a rental selects an asset ID or a quantity.

For quantity-based items:
- Track total quantity.
- Track available quantity.
- Track reserved quantity.
- Track rented quantity.
- Track damaged quantity.
- Track stock adjustments with reason, actor and timestamp.

Use inventory movements rather than directly editing balances without history.

## 6.7 Customer management

Customer fields:
- Customer type: individual or company.
- Full name / company legal name.
- Contact person (for companies).
- Primary phone.
- Alternative phone.
- Email (optional).
- Identification type and number (optional, collect only if business policy requires it).
- Billing address.
- Site / delivery address.
- Tax identification details (optional, based on approved accounting requirements).
- Notes.
- Status: active / archived.

Customer features:
- Search by name, phone or customer code.
- View rental history.
- View invoices and payment history.
- View outstanding balances.
- View deposits and refunds.
- View documents and agreements where permitted.
- Prevent accidental duplicate customer records with duplicate warnings.

Guarantor:
- Optional guarantor record linked to a rental or customer.
- Name, phone, relationship and approved identification details.
- Do not require a guarantor for every rental unless company policy says so.
- Restrict access to sensitive personal details.

## 6.8 Rental request and quotation

A rental may begin as a request or quotation before it becomes a confirmed rental.

Rental request fields:
- Request number.
- Customer.
- Requested equipment/model.
- Quantity or specific asset requirements.
- Requested start date/time.
- Expected end date/time.
- Delivery/site location.
- Customer notes.
- Created by.
- Request status.

Request statuses:
- `DRAFT`
- `SUBMITTED`
- `UNDER_REVIEW`
- `QUOTED`
- `APPROVED`
- `REJECTED`
- `CONVERTED`
- `CANCELLED`

Quotation:
- Quotation number.
- Customer and contact.
- Quoted equipment and quantity/assets.
- Rental period.
- Standard rate.
- Negotiated rate / discount.
- Delivery charges.
- Deposit requirement.
- Taxes if configured.
- Total amount.
- Valid until date.
- Terms and conditions.
- Prepared by and approved by.

A quotation must not reserve an asset indefinitely. Reservation behavior and expiry must be configurable.

## 6.9 Rental management

A confirmed rental is the central business record.

Required fields:
- Rental number, e.g. `RN-2026-000086`.
- Customer.
- Guarantor, optional.
- Rental location / project site.
- Start date and time.
- Expected return date and time.
- Actual return date and time.
- Rental pricing basis.
- Rental items.
- Agreed unit price.
- Quantity or asset IDs.
- Deposit requirement.
- Delivery / transport charges.
- Discount.
- Tax, if configured.
- Total rental amount.
- Amount paid.
- Balance due.
- Rental status.
- Notes and terms.
- Created by.
- Approved by, where required.

Rental statuses:
- `DRAFT`
- `PENDING_APPROVAL`
- `CONFIRMED`
- `READY_FOR_DISPATCH`
- `ACTIVE`
- `PARTIALLY_RETURNED`
- `RETURN_PENDING_INSPECTION`
- `COMPLETED`
- `OVERDUE`
- `CANCELLED`
- `DISPUTED`

A rental can contain more than one equipment item. Each item can have its own asset allocation, pricing, dispatch and return status.

### Rental duration

Calculate expected duration from the agreed rental period and pricing unit. Store timestamps and the agreed billing rule.

Do not rely on a simplistic `numberOfDays` field alone. Define:
- Whether a partial day is charged as a full day.
- Whether billing is calendar-day based or 24-hour based.
- Whether weekends/public holidays are chargeable.
- Grace period, if any.
- Late return rate.
- Rounding behavior.

These rules must be configurable and confirmed by AIQ.

## 6.10 Pricing and negotiation

Support configurable pricing units:
- Hour.
- Day.
- Week.
- Month.
- Custom period, if approved.

Pricing configuration:
- Default rate per equipment model.
- Optional asset-specific rate.
- Effective start/end dates for price changes.
- Optional customer-specific rate.
- Minimum hire duration.
- Deposit policy.
- Late-return rate.
- Delivery charge rules.

Negotiation workflow:
1. System displays the default price.
2. Staff enters proposed negotiated price or discount.
3. System calculates the difference from standard pricing.
4. If within the staff member's allowed limit, it may proceed.
5. If outside the limit, request Admin approval.
6. Store original price, proposed price, final agreed price, reason, requested by, approved by and timestamps.
7. Preserve the agreed price snapshot on the rental even if the default price changes later.

Never silently replace the standard rate with the negotiated rate.

## 6.11 Equipment dispatch / check-out

Before dispatch:
- Rental must be confirmed.
- Asset availability must be revalidated.
- Required deposit/payment policy must be satisfied or explicitly overridden by an authorized user.
- Asset must not be under maintenance, damaged or missing.

Dispatch record:
- Dispatch number.
- Rental and rental item.
- Asset ID / quantity.
- Dispatch date/time.
- Issued by.
- Customer recipient / site contact.
- Site location.
- Condition at dispatch.
- Accessories issued.
- Fuel/usage meter reading if relevant.
- Photos.
- Notes.
- Customer acknowledgement / signature, if enabled.

The paper card's `Date Out`, `Time Out` and `Issued By` must be retained in the digital flow.

Dispatch should update the asset lifecycle to `RENTED` only after the dispatch is confirmed.

## 6.12 Equipment return / check-in

Return record:
- Return number.
- Rental and rental item.
- Asset ID / quantity returned.
- Actual return date/time.
- Received by.
- Condition on return.
- Accessories returned.
- Missing accessories.
- Damage notes.
- Return photos.
- Meter/fuel reading if relevant.
- Additional charges.
- Inspection result.
- Next asset status.

Return outcomes:
- `PASSED_AVAILABLE`
- `REQUIRES_INSPECTION`
- `MAINTENANCE_REQUIRED`
- `DAMAGED`
- `MISSING_PARTS`
- `DISPUTED`

A returned asset must not automatically become available if it needs inspection or repair.

The paper card's `Date In`, `Time In` and `Received By` must be retained.

## 6.13 Overdue rentals and extensions

- Compare expected return timestamp with current time using `Africa/Dar_es_Salaam`.
- Mark a rental overdue only when its return deadline passes and the item remains unreturned.
- Show overdue duration and potential late fee separately.
- Do not automatically charge a late fee unless AIQ has approved the policy.
- Allow an authorized staff member to request an extension.
- Recheck future asset availability before approving extension.
- Preserve original expected return date and all extension history.

## 6.14 Inspection and maintenance

Inspection:
- Checklist based on equipment category/model.
- Condition before and after rental.
- Photos and notes.
- Inspection outcome.
- Inspector and timestamp.

Maintenance:
- Maintenance job number.
- Asset.
- Reported issue.
- Priority.
- Assigned technician/vendor (optional).
- Start and completion dates.
- Parts and labor costs.
- Total cost.
- Notes and attachments.
- Approval state.
- Return-to-service approval.

Maintenance completion must be explicitly confirmed before an asset becomes `AVAILABLE`.

## 6.15 Invoices

Generate a professional PDF invoice using the approved AIQ company profile and logo.

Invoice fields:
- Invoice number.
- Invoice date.
- Due date.
- Customer billing details.
- Rental number.
- Equipment description.
- Quantity / asset reference.
- Rental period.
- Unit price and pricing unit.
- Line subtotal.
- Discount.
- Delivery/transport charges.
- Taxes, if configured.
- Grand total.
- Amount paid.
- Balance due.
- Payment instructions.
- Terms and conditions.
- Issued by.

Invoice statuses:
- `DRAFT`
- `ISSUED`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `VOID`
- `CREDITED`

Rules:
- An issued invoice is immutable for audit purposes.
- Corrections use void/reissue or credit-note workflow.
- Invoice numbering is sequential and configurable by financial year/prefix.
- Do not claim tax compliance until the client's tax and invoicing requirements have been confirmed.

## 6.16 Payments and receipts

Support payment methods:
- Cash.
- Mobile money.
- Bank transfer.
- Card / POS, if later integrated.
- Other approved method.

Payment fields:
- Payment number.
- Customer.
- Rental.
- Invoice allocation.
- Amount.
- Currency (TZS initially).
- Payment method.
- Provider / bank (optional).
- Transaction/reference number.
- Received date/time.
- Received by.
- Notes.
- Status.

Payment statuses:
- `PENDING`
- `COMPLETED`
- `FAILED`
- `REVERSED`
- `REFUNDED`
- `VOIDED`

Payment rules:
- Support full and partial payments.
- Support multiple payments against one invoice.
- Support one payment allocated across multiple invoices only if finance approves this requirement.
- Maintain payment allocations.
- Calculate balance from invoice totals minus valid allocations and approved credits.
- A receipt is generated for each completed payment.
- A failed or pending payment must not reduce the balance.
- Never hard-delete a completed payment.
- Corrections require a reversal/adjustment with reason and audit log.

### Security deposit

Keep refundable security deposits separate from rental revenue.

Deposit lifecycle:
- Required.
- Collected.
- Held.
- Partially refunded.
- Fully refunded.
- Applied to approved damage/loss charges.
- Disputed.

Record deposit collection and refund as separate ledger entries. Do not count a refundable deposit as rental revenue unless it is lawfully and contractually applied to a charge.

## 6.17 Expenses and profitability

Expense categories:
- Equipment maintenance.
- Transport and delivery.
- Fuel.
- Parts and accessories.
- Repairs.
- Other operating costs.

Expense record:
- Expense number.
- Date.
- Category.
- Amount.
- Related asset/rental (optional).
- Supplier/payee.
- Payment method.
- Reference.
- Description.
- Attachment/receipt.
- Created by.
- Approved by.

Reports must distinguish:
- Rental revenue earned.
- Cash collected.
- Outstanding receivables.
- Refundable deposits held.
- Operating expenses.
- Maintenance costs.
- Estimated operating profit.

Do not label cash received as profit. Asset purchase cost, depreciation and tax accounting may require a later accounting integration or accountant-approved rules.

## 6.18 Reports and exports

Reports:
- Equipment register.
- Equipment availability.
- Equipment utilization.
- Rental register.
- Active rentals.
- Overdue rentals.
- Rental revenue.
- Customer balances.
- Invoice aging.
- Payment collections.
- Deposit liability.
- Maintenance history and cost.
- Expense summary.
- Asset performance.
- Estimated profitability.

Filters:
- Date range.
- Customer.
- Category.
- Equipment model.
- Asset.
- Rental status.
- Payment status.
- Staff member.
- Location.

Export:
- CSV / Excel for authorized users.
- PDF for printable reports.
- Print-friendly pages.

Every report must display the selected date range, generation timestamp and applied filters.

## 6.19 Notifications

In-app notifications initially:
- Rental due soon.
- Rental overdue.
- Return received.
- Asset requires inspection.
- Maintenance completed.
- Invoice issued.
- Payment recorded.
- Payment overdue.
- Price approval requested.
- Price approval completed.

Email/SMS/WhatsApp integrations are optional future work and must be separately approved, configured and tested. Do not hard-code a provider.

## 6.20 Audit logs

Audit events must include:
- Actor user ID.
- Action.
- Entity type and ID.
- Timestamp.
- Before/after values for sensitive changes where appropriate.
- IP/device metadata where lawful and available.
- Reason for financial or inventory adjustment.

Audit logs must cover:
- Asset status changes.
- Stock adjustments.
- Rental creation, edits and cancellation.
- Price overrides and approvals.
- Dispatch and return.
- Payment creation, reversal and refund.
- Invoice issue and void.
- Expense approval.
- Staff permission changes.
- System setting changes.

Audit logs should be append-only from the application perspective. Do not expose a normal delete action.

---

# 7. Smart forms and input experience

Smart forms are a core UX requirement. The goal is to make forms fast, guided, validated and difficult to misuse.

## 7.1 Form standards

Every form should have:
- Clear title and purpose.
- Logical field grouping.
- Visible required/optional labels.
- Helpful descriptions for unfamiliar fields.
- Inline validation.
- Server error handling.
- Loading and disabled states during submission.
- Save draft where the workflow supports it.
- Confirmation for destructive or financially sensitive actions.
- Unsaved-changes warning for long forms.
- Keyboard accessibility.
- Responsive layout.
- Clear success and failure feedback.

Use HeroUI v3 form components with React Hook Form and Zod. The backend must independently validate every submitted value.

## 7.2 Smart customer form

- Customer type selector changes relevant fields.
- Phone field supports Tanzania country code formatting but stores normalized E.164 where possible.
- Duplicate phone/name warnings.
- Company selection reveals company/contact-person fields.
- Address fields support optional site and billing address.
- Guarantor is optional and can be captured within the rental workflow.

## 7.3 Smart equipment form

- Select category first.
- Load category-specific model fields.
- Select individual tracking or quantity tracking.
- Generate Asset ID from a configurable sequence.
- Allow multiple image uploads with preview.
- Validate duplicate serial numbers where serial numbers are expected to be unique.
- Show pricing configuration separately from purchase cost.
- Provide a review step before saving multiple assets.

## 7.4 Smart rental form

Recommended multi-step flow:
1. Customer.
2. Equipment selection.
3. Date/time and availability.
4. Pricing and negotiation.
5. Delivery/site and guarantor.
6. Deposit and payment terms.
7. Review and confirm.

Behavior:
- Availability is checked by the backend.
- Selecting a model shows available quantity/assets for the requested period.
- Date/time changes trigger a fresh availability check.
- Price is calculated from the server-approved pricing rules.
- Staff cannot manipulate the final total by changing frontend values.
- Discounts outside permission limits require approval.
- Rental draft can be saved without reserving stock unless configured otherwise.

## 7.5 Smart dispatch form

- Only eligible rental items/assets appear.
- Display asset photo and current condition.
- Checklist of accessories.
- Camera/file upload for handover photos.
- Require dispatch confirmation.
- Capture recipient and issued-by staff.

## 7.6 Smart return form

- Show what was dispatched and what accessories were issued.
- Pre-fill expected return details.
- Capture actual return date/time.
- Compare issued and returned accessories.
- Ask for condition and inspection outcome.
- Require notes/photos when damage or missing accessories is selected.
- Calculate potential additional charge as a draft; require authorized approval before final billing.
- Send assets requiring inspection to the correct status.

## 7.7 Smart payment form

- Show invoice total, paid amount and balance before entry.
- Validate payment amount is positive.
- Show method-specific reference fields.
- Prevent accidental duplicate reference entries where provider/reference uniqueness applies.
- Confirm amount and allocation before posting.
- Generate receipt only after payment status is completed.
- Make deposit collection/refund clearly distinct from rental payment.

---

# 8. Database design

Use PostgreSQL with Prisma. Use UUID primary keys for internal relations and human-readable sequential identifiers for documents/assets. Use `Decimal`/numeric for money; never use floating-point values for currency.

The following is the conceptual data model. Exact columns and constraints should be refined during schema design.

## 8.1 Core tables

### users
- id
- full_name
- username
- email
- phone
- password_hash
- status
- last_login_at
- created_at
- updated_at

### roles
- id
- name (`ADMIN`, `STAFF`)
- description

### permissions
- id
- key
- description

### user_roles
- user_id
- role_id

### role_permissions
- role_id
- permission_id

### customers
- id
- customer_code
- customer_type
- full_name
- company_name
- contact_person
- phone
- alternate_phone
- email
- billing_address
- site_address
- status
- notes
- created_at
- updated_at

### customer_guarantors
- id
- customer_id (nullable if attached to rental only)
- rental_id (nullable)
- full_name
- phone
- relationship
- identification_type
- identification_number_encrypted (if collected)
- created_at

### equipment_categories
- id
- name
- code
- description
- tracking_mode (`INDIVIDUAL`, `QUANTITY`, `HYBRID`)
- status
- created_at
- updated_at

### equipment_models
- id
- category_id
- name
- brand
- model_number
- description
- specifications_json
- default_deposit
- status
- created_at
- updated_at

### equipment_assets
- id
- asset_code
- model_id
- serial_number
- qr_code_value
- purchase_date
- purchase_cost
- current_location
- condition
- status
- notes
- created_at
- updated_at

### equipment_images
- id
- asset_id (nullable)
- model_id (nullable)
- file_key
- original_filename
- mime_type
- size_bytes
- uploaded_by
- created_at

### equipment_accessories
- id
- model_id
- name
- description
- is_required

### asset_accessories
- id
- asset_id
- accessory_id
- quantity_owned

### inventory_movements
- id
- asset_id (nullable)
- model_id
- movement_type
- quantity_delta
- from_status
- to_status
- reference_type
- reference_id
- reason
- performed_by
- created_at

### equipment_prices
- id
- model_id
- asset_id (nullable)
- pricing_unit
- amount
- minimum_duration
- effective_from
- effective_to
- is_active
- created_at

### rental_requests
- id
- request_number
- customer_id
- requested_start_at
- requested_end_at
- site_location
- notes
- status
- created_by
- created_at

### rental_request_items
- id
- rental_request_id
- model_id
- quantity
- requested_asset_id (nullable)
- notes

### quotations
- id
- quotation_number
- customer_id
- rental_request_id (nullable)
- valid_until
- subtotal
- discount_total
- delivery_total
- tax_total
- grand_total
- status
- prepared_by
- approved_by
- created_at

### rentals
- id
- rental_number
- customer_id
- quotation_id (nullable)
- start_at
- expected_return_at
- actual_return_at (nullable)
- site_location
- subtotal
- discount_total
- delivery_total
- tax_total
- grand_total
- amount_paid_cached (optional derived cache only)
- balance_cached (optional derived cache only)
- status
- terms_snapshot
- created_by
- approved_by
- created_at
- updated_at

### rental_items
- id
- rental_id
- model_id
- asset_id (nullable)
- quantity
- pricing_unit
- unit_price
- agreed_duration
- line_subtotal
- discount_amount
- status
- created_at

### price_approvals
- id
- rental_id
- rental_item_id
- standard_price
- proposed_price
- approved_price
- discount_reason
- requested_by
- approved_by
- status
- requested_at
- approved_at

### dispatches
- id
- dispatch_number
- rental_id
- dispatched_at
- issued_by
- recipient_name
- site_location
- notes
- status

### dispatch_items
- id
- dispatch_id
- rental_item_id
- asset_id (nullable)
- quantity
- condition_out
- accessories_json
- meter_reading
- notes

### returns
- id
- return_number
- rental_id
- received_at
- received_by
- notes
- status

### return_items
- id
- return_id
- rental_item_id
- asset_id (nullable)
- quantity_returned
- condition_in
- accessories_returned_json
- damage_notes
- missing_items_json
- inspection_status
- additional_charge_draft
- notes

### inspections
- id
- asset_id
- return_item_id (nullable)
- checklist_json
- outcome
- notes
- inspected_by
- inspected_at

### maintenance_jobs
- id
- maintenance_number
- asset_id
- issue_description
- priority
- status
- started_at
- completed_at
- labor_cost
- parts_cost
- other_cost
- total_cost
- reported_by
- approved_by
- created_at

### invoices
- id
- invoice_number
- customer_id
- rental_id
- issued_at
- due_at
- subtotal
- discount_total
- delivery_total
- tax_total
- grand_total
- status
- pdf_file_key
- issued_by
- created_at

### invoice_items
- id
- invoice_id
- description
- quantity
- unit
- unit_price
- line_total
- source_rental_item_id (nullable)

### payments
- id
- payment_number
- customer_id
- amount
- currency
- method
- provider
- reference_number
- received_at
- status
- notes
- received_by
- created_at

### payment_allocations
- id
- payment_id
- invoice_id
- allocated_amount
- created_at

### security_deposits
- id
- rental_id
- customer_id
- required_amount
- collected_amount
- refunded_amount
- applied_amount
- status
- created_at
- updated_at

### deposit_transactions
- id
- security_deposit_id
- transaction_type (`COLLECT`, `REFUND`, `APPLY_TO_CHARGE`, `REVERSAL`)
- amount
- reference
- reason
- performed_by
- created_at

### expenses
- id
- expense_number
- category
- description
- amount
- expense_date
- supplier
- payment_method
- reference_number
- related_asset_id (nullable)
- related_rental_id (nullable)
- attachment_key (nullable)
- status
- created_by
- approved_by
- created_at

### files
- id
- storage_key
- original_filename
- mime_type
- size_bytes
- uploaded_by
- created_at

### notifications
- id
- user_id
- type
- title
- message
- entity_type
- entity_id
- read_at
- created_at

### audit_logs
- id
- actor_user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- reason
- ip_address
- user_agent
- created_at

### company_settings
- id
- legal_name
- display_name
- logo_file_key
- address
- phone
- email
- website
- tax_identifiers_json
- invoice_prefix
- rental_prefix
- currency
- timezone
- updated_at

## 8.2 Database constraints and integrity

Implement:
- Unique constraints for asset code, document numbers and relevant transaction references.
- Foreign keys with deliberate delete behavior.
- Soft archive for business entities where history must remain.
- Check constraints for non-negative monetary amounts where appropriate.
- Decimal precision for money.
- Indexes for phone, customer code, asset code, serial number, status, dates and foreign keys.
- Transaction boundaries for rental confirmation, dispatch, return, invoice issue and payment allocation.
- Row locking or equivalent concurrency control when allocating assets.
- Idempotency keys for payment posting and other retryable operations.
- Immutable snapshots of agreed price and invoice line descriptions.

Never delete an asset that has rental history. Retire/archive it instead.

---

# 9. API design

Base URL: `/api/v1`

Use REST conventions, DTO validation, pagination, filtering and consistent error responses.

## 9.1 Authentication
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me`

## 9.2 Users and permissions
- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `PATCH /users/:id/status`
- `GET /roles`
- `GET /permissions`
- `PATCH /users/:id/permissions`

## 9.3 Customers
- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `GET /customers/:id/rentals`
- `GET /customers/:id/statement`
- `GET /customers/:id/balance`

## 9.4 Equipment and inventory
- `GET /equipment/categories`
- `POST /equipment/categories`
- `PATCH /equipment/categories/:id`
- `GET /equipment/models`
- `POST /equipment/models`
- `GET /equipment/models/:id`
- `PATCH /equipment/models/:id`
- `GET /equipment/assets`
- `POST /equipment/assets`
- `GET /equipment/assets/:id`
- `PATCH /equipment/assets/:id`
- `GET /equipment/assets/:id/history`
- `GET /inventory/summary`
- `POST /inventory/adjustments`
- `GET /inventory/availability`

## 9.5 Pricing
- `GET /pricing/models/:modelId`
- `POST /pricing`
- `PATCH /pricing/:id`
- `POST /pricing/price-override-requests`
- `POST /pricing/price-override-requests/:id/approve`
- `POST /pricing/price-override-requests/:id/reject`

## 9.6 Rental requests, quotations and rentals
- `GET /rental-requests`
- `POST /rental-requests`
- `GET /rental-requests/:id`
- `PATCH /rental-requests/:id`
- `POST /quotations`
- `GET /quotations/:id`
- `POST /quotations/:id/issue`
- `POST /quotations/:id/convert-to-rental`
- `GET /rentals`
- `POST /rentals`
- `GET /rentals/:id`
- `PATCH /rentals/:id`
- `POST /rentals/:id/confirm`
- `POST /rentals/:id/cancel`
- `POST /rentals/:id/request-extension`
- `POST /rentals/:id/approve-extension`

## 9.7 Dispatch and returns
- `POST /dispatches`
- `GET /dispatches`
- `GET /dispatches/:id`
- `POST /dispatches/:id/confirm`
- `POST /returns`
- `GET /returns`
- `GET /returns/:id`
- `POST /returns/:id/inspect`
- `POST /returns/:id/complete`

## 9.8 Maintenance
- `GET /maintenance`
- `POST /maintenance`
- `GET /maintenance/:id`
- `PATCH /maintenance/:id`
- `POST /maintenance/:id/complete`
- `POST /maintenance/:id/return-to-service`

## 9.9 Invoices, payments and deposits
- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:id`
- `POST /invoices/:id/issue`
- `POST /invoices/:id/void`
- `GET /invoices/:id/pdf`
- `GET /payments`
- `POST /payments`
- `GET /payments/:id`
- `POST /payments/:id/reverse`
- `POST /payments/:id/allocate`
- `POST /deposits`
- `GET /deposits/:id`
- `POST /deposits/:id/collect`
- `POST /deposits/:id/refund`
- `POST /deposits/:id/apply-charge`

## 9.10 Expenses and reports
- `GET /expenses`
- `POST /expenses`
- `PATCH /expenses/:id`
- `POST /expenses/:id/approve`
- `GET /reports/rentals`
- `GET /reports/revenue`
- `GET /reports/payments`
- `GET /reports/outstanding`
- `GET /reports/inventory`
- `GET /reports/utilization`
- `GET /reports/maintenance`
- `GET /reports/profitability`

## 9.11 API response conventions

Success response:
```json
{
  "data": {},
  "meta": {
    "requestId": "server-generated-id"
  }
}
```

Paginated response:
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 125,
    "totalPages": 7
  }
}
```

Error response:
```json
{
  "statusCode": 422,
  "code": "VALIDATION_ERROR",
  "message": "The submitted data is invalid.",
  "details": [],
  "requestId": "server-generated-id"
}
```

Use appropriate HTTP status codes. Do not leak stack traces, database details or sensitive information in production responses.

---

# 10. Core business workflows

## 10.1 Equipment onboarding

1. Admin creates a category.
2. Admin creates an equipment model under that category.
3. Admin chooses individual, quantity or hybrid tracking.
4. Admin configures default price and deposit policy.
5. Admin registers individual assets or initial quantity.
6. System generates unique asset codes and QR values.
7. Admin adds photos, serial numbers, location and condition.
8. Assets become Available only after required setup is complete.

## 10.2 Rental workflow

```text
Customer Request
      |
      v
Customer Selection / Registration
      |
      v
Equipment + Quantity / Asset Selection
      |
      v
Availability Validation
      |
      v
Pricing Calculation
      |
      v
Negotiation / Approval (if required)
      |
      v
Quotation / Rental Confirmation
      |
      v
Invoice + Deposit / Payment Terms
      |
      v
Dispatch Checklist + Evidence
      |
      v
ACTIVE RENTAL
      |
      +---- Extension request (optional)
      |
      v
Return / Check-in
      |
      v
Inspection
      |
      +---- Passed ----------> Available
      |
      +---- Repair needed ---> Maintenance
      |
      +---- Dispute ----------> Disputed / Admin review
      |
      v
Final charges + balance reconciliation
      |
      v
Deposit refund / application (if applicable)
      |
      v
Rental Completed
```

## 10.3 Payment workflow

1. Staff opens the invoice or rental payment screen.
2. System displays current total, valid payments and balance.
3. Staff enters amount and method.
4. Backend validates amount, permissions and reference.
5. Payment is recorded in a database transaction.
6. Payment allocation is created.
7. Invoice balance/status is recalculated.
8. Receipt is generated for completed payment.
9. Audit log is written.
10. Dashboard/reporting aggregates update.

## 10.4 Return workflow

1. Staff finds active rental.
2. System displays dispatched assets and accessories.
3. Staff records actual return time.
4. Staff records condition and accessories.
5. Staff uploads evidence where needed.
6. Backend creates return and inspection records.
7. Asset moves to Available, Inspection, Maintenance or Damaged as appropriate.
8. Late fees or damage charges are calculated as drafts according to policy.
9. Authorized user reviews additional charges.
10. Finance reconciles final invoice and deposit.

---

# 11. Critical business rules

1. Availability must be checked on the backend at confirmation and dispatch time.
2. Prevent double-booking of the same physical asset for overlapping time ranges.
3. For quantity stock, reserve/decrement quantities atomically.
4. A quotation must not silently become a confirmed rental.
5. A rental must preserve the price agreed at confirmation.
6. A price override must preserve standard price, proposed price, approved price and reason.
7. Staff cannot approve their own override when separation of duties is required.
8. A completed payment cannot be deleted.
9. Refunds and reversals must be separate ledger events.
10. Deposits must remain separate from rental income.
11. Issued invoices must be immutable; use void/reissue or credit notes.
12. Returned equipment requiring inspection cannot become available prematurely.
13. Overdue status must be based on timezone-aware timestamps.
14. Late charges must follow an approved policy.
15. All monetary calculations use decimal arithmetic on the backend.
16. All financial totals are recalculated by the backend, never trusted from the browser.
17. Every inventory adjustment requires a reason and actor.
18. All sensitive operations create audit events.
19. Archived records remain available to historical reports.
20. Document numbers must be generated safely under concurrent requests.

---

# 12. Security, privacy and reliability

Security requirements:
- HTTPS only in production.
- Secure password hashing.
- Secure, HttpOnly, SameSite cookies where cookie-based sessions are used.
- CSRF protection where required by the chosen authentication approach.
- Strict CORS allowlist.
- Rate limiting on login, password reset and sensitive endpoints.
- DTO validation and output sanitization.
- Role/permission guards on every protected API route.
- File upload type, size and authorization validation.
- Private object storage with short-lived signed URLs.
- Secrets stored in environment/secret manager, never committed.
- Database least-privilege credentials.
- Audit financial and inventory actions.
- Avoid storing unnecessary personal identification information.
- Encrypt highly sensitive fields where collected and restrict their access.
- Backups encrypted at rest and restore-tested.

Reliability:
- Database transactions for multi-step business operations.
- Idempotency for retryable financial requests.
- Structured logs with request IDs.
- Health and readiness endpoints.
- Monitoring for API errors, database connectivity and background jobs.
- Automated backups and documented recovery procedure.

---

# 13. Non-functional requirements

- Responsive UI on desktop, tablet and mobile.
- Accessible keyboard navigation and form labels.
- Clear loading, error, empty and success states.
- Search and filters on all large data lists.
- Server-side pagination for large tables.
- Avoid loading all equipment/rental records into the browser.
- Typical list endpoints should target fast response times under normal business load.
- Support future growth in equipment count, rental volume and staff accounts.
- All application timestamps stored consistently (UTC recommended) and displayed in `Africa/Dar_es_Salaam`.
- Currency defaults to TZS; currency formatting must be centralized.
- Support future Swahili translation without rewriting components.
- Avoid business rules duplicated independently in frontend and backend.

---

# 14. Frontend screen specifications

## 14.1 Login
- AIQ logo.
- AIQ HireFlow product name.
- Email/username and password.
- Show/hide password.
- Forgot password.
- Clear error states.
- Responsive centered layout.

## 14.2 Admin dashboard
- KPI cards.
- Revenue and collection chart.
- Equipment status chart.
- Rentals due/overdue list.
- Recent payments.
- Recent activity.
- Quick actions: Add Equipment, New Rental, Add Customer, Record Payment.

## 14.3 Staff dashboard
- My operational queue.
- Dispatches to prepare.
- Returns to receive.
- Rentals due today.
- Overdue items.
- Quick action to create a rental.

## 14.4 Equipment list
- Search.
- Category/model/status filters.
- Asset code, image, equipment, category, location, condition and status.
- Row actions: view, edit, QR, history.
- Bulk import only after validation and preview.
- Add Equipment action.

## 14.5 Equipment details
Tabs:
- Overview.
- Rental history.
- Maintenance.
- Inspections.
- Photos and documents.
- Activity history.

## 14.6 Customers
- Search by customer name/phone/code.
- Customer type and status filters.
- Customer detail page with rentals, invoices, payments and balance.
- Create/edit customer smart form.

## 14.7 Rentals
- Table with rental number, customer, equipment, start, expected return, status, total, paid and balance.
- Filters for status, date range, customer and staff.
- Rental details page with timeline.
- Actions based on permission and state.

## 14.8 Rental creation
- Multi-step form.
- Availability calendar/list.
- Pricing breakdown.
- Negotiation approval.
- Deposit and payment terms.
- Review and confirm.

## 14.9 Dispatch
- Dispatch queue.
- Asset condition checklist.
- Accessories.
- Photos.
- Recipient details.
- Confirm dispatch.

## 14.10 Returns
- Expected returns list.
- Overdue filter.
- Return form with dispatched-vs-returned comparison.
- Inspection outcome.
- Additional charge review.

## 14.11 Finance
- Invoice table and detail.
- Payment ledger.
- Outstanding balance view.
- Deposit ledger.
- Expense management.
- Receipt and PDF preview.

## 14.12 Reports
- Date filters.
- Report-specific filters.
- Chart/table view.
- Export actions.
- Clear report definitions and calculation notes.

---

# 15. Document design requirements

All generated documents must be professional, printable and consistent with the AIQ identity.

Documents:
- Rental quotation.
- Rental agreement.
- Rental dispatch note.
- Equipment return note.
- Invoice.
- Payment receipt.
- Customer statement.
- Equipment maintenance report.

Invoice/receipt layout:
- Approved AIQ logo.
- Legal/display company name.
- Address, phone, email and website from company settings.
- Document number and issue date.
- Customer details.
- Rental reference.
- Itemized charges.
- Payment and balance summary.
- Terms and payment instructions.
- Prepared/approved by where appropriate.

Do not invent company address, tax number, bank details or payment instructions. Admin must enter and approve these in Company Settings before document generation.

---

# 16. Testing strategy

## 16.1 Unit tests
Test:
- Pricing calculation.
- Rental duration and billing rules.
- Discount limits.
- Deposit balance.
- Invoice balance.
- Payment allocation.
- Overdue calculation.
- Asset status transitions.
- Permission checks.

## 16.2 Integration tests
Test:
- Rental confirmation with asset reservation.
- Concurrent booking attempts for one asset.
- Dispatch transaction.
- Return and inspection transaction.
- Payment posting and receipt generation.
- Invoice issue and immutability.
- Deposit collection/refund.
- Audit log creation.

## 16.3 End-to-end tests
Critical scenarios:
1. Admin logs in and creates a category, model and asset.
2. Staff registers a customer.
3. Staff creates a rental request and quotation.
4. System checks availability.
5. Staff requests price override.
6. Admin approves it.
7. Staff confirms rental.
8. Invoice is generated.
9. Staff records partial payment.
10. Staff dispatches the asset.
11. Rental becomes active.
12. System marks rental overdue after the configured deadline.
13. Staff records an extension or return.
14. Inspection routes asset to Available or Maintenance.
15. Final payment/deposit reconciliation completes.
16. Admin sees correct reports and audit history.

## 16.4 Quality gates
Before production:
- TypeScript strict checks pass.
- Lint passes.
- Unit and integration tests pass.
- Critical E2E scenarios pass.
- Database migrations tested on staging.
- Backup and restore tested.
- Permission matrix reviewed.
- PDF output reviewed.
- Mobile/tablet layout reviewed.
- No secrets or sample customer data committed.

---

# 17. Development phases

## Phase 1 — Foundation
- Repository and environments.
- Next.js + HeroUI v3 setup.
- NestJS modular architecture.
- PostgreSQL + Prisma.
- Authentication.
- Admin/Staff roles and permissions.
- Company settings.
- Audit logging foundation.

## Phase 2 — Inventory
- Categories.
- Models.
- Individual assets.
- Quantity stock where required.
- Asset photos.
- QR codes.
- Inventory movement history.
- Availability foundation.

## Phase 3 — Customers and rentals
- Customer management.
- Rental requests.
- Quotations.
- Availability checks.
- Pricing rules.
- Negotiation approval.
- Rental confirmation.
- Rental calendar.

## Phase 4 — Dispatch and returns
- Dispatch.
- Handover checklists.
- Return.
- Inspection.
- Damage/missing accessories.
- Maintenance workflow.
- Overdue and extension logic.

## Phase 5 — Finance and documents
- Invoices.
- Partial/full payments.
- Payment allocations.
- Receipts.
- Security deposits.
- Expenses.
- Customer statements.
- PDF generation.

## Phase 6 — Reports and production hardening
- Dashboard metrics.
- Operational and financial reports.
- Exports.
- Notifications.
- Performance tuning.
- Security review.
- Backups, monitoring and deployment.

Do not start by building charts and decorative dashboard cards before the underlying inventory, rental and financial rules are reliable.

---

# 18. Seed data and demo environment

Create clearly labelled demo data for development only:
- Categories: Concrete Equipment, Surveying Equipment, Power Equipment, Hand Tools.
- Models: Poker Vibrator, Concrete Mixer, Generator, Theodolite, Drill.
- Assets: a small number of sample assets with unique IDs.
- Customers: fictional names and phone numbers only.
- Staff: demo Admin and Staff accounts using secure setup instructions.

Do not seed the actual customer phone number or any personal details shown on the sample paper card into production or public demo environments.

All sample prices must be clearly labelled as examples and must be replaced by Admin-approved AIQ pricing before go-live.

---

# 19. Production deployment and operations

Environments:
- Local development.
- Staging/UAT.
- Production.

Production checklist:
- Configure domain and HTTPS.
- Configure environment variables and secrets.
- Provision PostgreSQL with automated backups.
- Configure private object storage.
- Run Prisma migrations through a controlled deployment step.
- Configure allowed CORS origins.
- Configure logging and monitoring.
- Configure email/SMS only if approved.
- Create initial Admin account securely.
- Confirm company profile and logo.
- Confirm invoice/rental numbering.
- Confirm pricing and billing policies.
- Confirm payment methods and deposit policy.
- Train Admin and Staff.
- Import existing equipment stock only after data cleanup and verification.

Provide a documented rollback and restore process. Never run destructive database migrations directly against production without a backup and review.

---

# 20. Decisions required from AIQ before implementation

The following business policies must be confirmed. They should not be guessed by developers.

1. Exact registered company name and invoice display name.
2. Company address, phone, email, website and approved logo files.
3. Whether the system is English-only initially or bilingual English/Swahili.
4. Rental billing: hourly, daily, weekly, monthly or combinations.
5. Whether one rental can contain multiple equipment types.
6. Whether every machine is individually tracked with an Asset ID.
7. Which consumables/accessories should use quantity tracking.
8. Whether a quotation reserves stock, and for how long.
9. Deposit policy: mandatory, optional, category-specific or customer-specific.
10. Whether staff can approve discounts within a limit.
11. Who approves damage charges and late-return fees.
12. Grace period and late-return calculation.
13. Whether delivery/transport charges are fixed, distance-based or manually entered.
14. Which payment methods are accepted.
15. Whether mobile money integration is required in phase one or manual recording is sufficient.
16. Whether rental agreement signatures are required.
17. Whether customer identification and guarantor information are mandatory for particular rentals.
18. Tax/VAT and invoice compliance requirements, confirmed by the company's accountant.
19. Whether the system needs multiple branches/warehouses in the first release.
20. Whether stock opening balances will be imported from spreadsheets or entered manually.

---

# 21. Definition of done

AIQ HireFlow is ready for initial production when:

- Admin and Staff can log in securely.
- Permissions are enforced by the backend.
- Admin can create categories, models and equipment assets without developer assistance.
- The system accurately distinguishes available, rented, reserved, damaged and maintenance assets.
- Staff can register customers and create rental requests.
- The system prevents double-booking.
- Pricing, negotiation and approval history work correctly.
- Dispatch and return records preserve equipment condition and evidence.
- Partial and full payments update balances correctly.
- Deposits are tracked separately.
- Invoices and receipts generate as PDFs with approved company details.
- Overdue rentals are identifiable.
- Reports reconcile with source records.
- Audit logs capture sensitive actions.
- Backups and restore procedures are tested.
- Critical user journeys pass automated tests.
- AIQ has approved the business policies and completed user acceptance testing.

---

# 22. Final engineering instruction

Build AIQ HireFlow as a reliable business operations product, not as a collection of disconnected screens.

The frontend must use Next.js App Router, TypeScript, HeroUI v3 and Tailwind CSS v4. Prioritize reusable smart forms, clear tables, accessible controls, consistent icons, readable typography and polished Admin/Staff dashboards.

The backend must use NestJS with a modular architecture, PostgreSQL and Prisma. All important business rules—including availability, price calculation, permissions, payment allocation, deposits, dispatch, return and asset status transitions—must be enforced server-side.

The database must preserve history. The UI must make operational states obvious. Financial documents must be traceable. No important action should happen without authorization, validation and an audit record.

**The central goal is simple: at any moment, AIQ Admin should be able to answer accurately:**
- What equipment does the company own?
- Where is every asset?
- Which equipment is available right now?
- Which customer has each rented asset?
- When is it expected back?
- What condition was it in when it left and when it returned?
- How much has been invoiced, collected and is still outstanding?
- What deposits are being held?
- What has maintenance cost?
- Which equipment and rentals are contributing to business performance?

If the system can answer those questions accurately and support the full rental workflow from request to financial closure, it is delivering the intended value.

---

# Official technical references

- HeroUI v3 Quick Start: https://heroui.com/en/docs/react/getting-started/quick-start
- HeroUI Next.js setup: https://heroui.com/en/docs/react/getting-started/frameworks
- HeroUI v2 to v3 migration: https://heroui.com/en/docs/react/migration
- HeroUI releases: https://heroui.com/en/docs/react/releases
- Next.js documentation: https://nextjs.org/docs
- NestJS documentation: https://docs.nestjs.com/
- Prisma documentation: https://www.prisma.io/docs
- PostgreSQL documentation: https://www.postgresql.org/docs/
- TanStack Query: https://tanstack.com/query/latest
- TanStack Table: https://tanstack.com/table/latest
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- Lucide icons: https://lucide.dev/
