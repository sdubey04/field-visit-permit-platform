# Field Visit Permit Platform

A small field visit planning and approval service, consisting of a REST API, a relational database schema, and a front end that exercises the API.

The application provides:

* A REST API using Node.js and Express
* A PostgreSQL relational database
* JWT-based authentication
* Server-side role-based authorization
* Field visit lifecycle management
* Approval decision history
* HQ summary reporting
* A minimal React frontend
* Automated tests for lifecycle, authorization, security and edge cases

---

## 1. Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* JWT
* bcrypt
* pg
* dotenv
* cors

### Frontend

* React
* Vite
* JavaScript
* Fetch API

### Testing

* Jest
* Supertest

---

## 2. Project Structure

```text
field-visit-permit-platform/
│
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── tests/
│   │   ├── visit.lifecycle.test.js
│   │   ├── security.misuse.test.js
│   │   └── edge.cases.test.js
│   │
│   ├── .env
│   ├── package.json
│   └── package-lock.json
│
├── Frontend/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── ...
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── Database/
│   ├── schema.sql
│   └── seed.sql
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Prerequisites

Install the following before running the project:

* Node.js
* npm
* PostgreSQL
* Git

---

## 4. Setup

### 4.1 Clone the repository

```bash
git clone git@github.com:sdubey04/field-visit-permit-platform.git
cd field-visit-permit-platform
```

### 4.2 Create the PostgreSQL database

Create a PostgreSQL database named:

```text
field_visit_permit_database
```

For example:

```bash
createdb -U postgres field_visit_permit_database
```

### 4.3 Create the database schema

From the project root:

```bash
psql -U postgres -d field_visit_permit_database -f Database/schema.sql
```

### 4.4 Load seed data

```bash
psql -U postgres -d field_visit_permit_database -f Database/seed.sql
```

The seed data contains:

* Two field officers
* One HQ approver
* One admin
* Three locations
* Visits in different lifecycle states
* Approval decision history

### 4.5 Configure backend environment variables

Create:

```text
Backend/.env
```

using the root `.env.example` values as a guide.

Example:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/field_visit_permit_database
JWT_SECRET=replace_with_long_random_secret
JWT_EXPIRES_IN=1h
```

Never commit the real `.env` file.

### 4.6 Install backend dependencies

```bash
cd Backend
npm install
```

### 4.7 Start the backend

Development mode:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

---

## 5. Frontend Setup

Open another terminal.

From the project root:

```bash
cd Frontend
npm install
```

Create:

```text
Frontend/.env
```

with:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Then start the frontend:

```bash
npm run dev
```

The frontend will be available at the Vite development URL shown in the terminal, normally:

```text
http://localhost:5173
```

---

## 6. Test Credentials

### FIELD_OFFICER

```text
Email: fieldofficer1@eaii.org
Password: Officer1@123
```

### FIELD_OFFICER

```text
Email: fieldofficer2@eaii.org
Password: Officer2@123
```

### HQ_APPROVER

```text
Email: approver1@eaii.org
Password: Approver1@123
```

### ADMIN

```text
Email: admin1@eaii.org
Password: Admin1@123
```

These are local seeded test credentials only.

---

## 7. Roles and Permissions

### FIELD_OFFICER

A field officer can:

* Create their own visits
* View only their own visits
* Edit their own visits while editable
* Submit their own visits
* Resubmit their own rejected visits
* Complete their own approved visits

### HQ_APPROVER

An HQ approver can:

* View submitted visits
* Approve pending visits
* Reject pending visits
* View the HQ summary

An approver cannot create their own visit, for now.

### ADMIN

An admin can do everything an HQ approver can do and can also view all visits regardless of state.

---

## 8. Visit Lifecycle

Only the following transitions are allowed:

```text
DRAFT      --Submit-->    PENDING         The oﬃcer who created the visit
PENDING    --Approve-->   APPROVED        An approver — never the creator
PENDING    --Reject-->    REJECTED        An approver — never the creator
REJECTED   --Resubmit-->  PENDING         The oﬃcer who created the visit
APPROVED   --Complete-->  COMPLETED       The oﬃcer who created the visit
```

`COMPLETED` is terminal.

All other lifecycle transitions are rejected by the backend.

* A rejection must contain a written remark. An approval remark is optional. *

Visits are editable only while they are in:

```text
DRAFT
REJECTED
```

This is the interpretation used for the "still editable" requirement.

---

## 9. API Endpoints

The API uses the following routes.

### Authentication

```http
POST /api/auth/login
```

Accepts:

```json

{
  "email": "fieldofficer1@eaii.org",
  "password": "Officer1@123"
}
```

Returns a JWT token.


---

### Visits

```http
POST /api/visits
GET /api/visits
GET /api/visits/:id
PUT /api/visits/:id
POST /api/visits/:id/submit
POST /api/visits/:id/decision
POST /api/visits/:id/complete
```

List filtering supports:

```text
status
location_id
page
limit
```

Example:

```http
GET /api/visits?page=1&limit=5&status=PENDING&location_id=1
```

---

### Locations

```http
GET /api/locations
```

---

### HQ Summary

```http
GET /api/summary
```

The summary contains:

* Visit counts by status
* Per-location visit count
* Total planned cost per location

The endpoint is restricted to:

```text
HQ_APPROVER
ADMIN
```

---

## 10. Authentication and Authorization

Authentication uses JWT tokens.

After login, the client sends:

```http
Authorization: Bearer <token>
```

Every endpoint except login requires authentication.

Passwords are stored only as bcrypt hashes.

Authorization is enforced on the backend rather than relying on frontend visibility.

Ownership is also checked server-side. A field officer cannot access, modify, submit or complete another officer's visit by changing a visit ID in the request.

---

## 11. Data Model

The PostgreSQL schema contains four main entities:

```text
users
locations
visits
approval_decisions
```

### users

Stores application users, their roles and password hashes.

### locations

Stores locations used by visits.

### visits

Stores the visit itself, including:

* Title
* Purpose
* Location
* Planned date
* Estimated cost
* Status
* Creator

### approval_decisions

Stores approval/rejection history separately from the visit.

This allows a visit to be rejected and later resubmitted while preserving previous decision history.

---

## 12. Database Constraints

Important database constraints include:

* Unique user email
* Valid user role values
* Valid visit status values
* Non-negative estimated cost
* Foreign keys between visits, users and locations
* Valid approval decision values
* Rejection decisions require a non-blank remark
* Visit title and purpose cannot be blank

The database constraints complement the application-level validation and lifecycle checks.

---

## 13. Indexes

The following indexes were added based on the application's access patterns:

### `users.email`

Used for login lookups by email.

### `visits.created_by`

Used when field officers retrieve their own visits.

### `visits.status`

Used for status filtering and pending/approval-related queries.

### `visits.location_id`

Used for location filtering and location-based summary queries.

### `approval_decisions.visit_id`

Used when loading the full decision history for a visit.

Indexes were deliberately not added to every column. For example, an index on `estimated_cost` was not added because the required API does not perform searches or ordering primarily by cost. Additional indexes would add write/storage overhead without supporting a demonstrated query pattern.

---

## 14. Transaction Handling

Approve/reject operations use a database transaction.

The decision record and the visit status change are treated as one operation:

```text
BEGIN
  insert approval decision
  update visit status
COMMIT
```

If either operation fails, the transaction is rolled back.

This prevents the approval history and visit status from becoming inconsistent.

---

## 15. Testing

The project includes automated tests covering lifecycle and security rules.

Run:

```bash
cd Backend
npm test
```

The current test suite covers:

* Lifecycle transitions
* Invalid lifecycle transitions
* Cross-user access
* Role restrictions
* Approver self-approval protection
* Missing rejection remarks
* Authentication failures
* Invalid IDs
* Invalid locations
* Negative costs
* Blank titles
* Protected fields such as `status` and `created_by`
* Admin access
* Summary authorization

---

## 16. Trade-offs and Known Gaps

The project intentionally keeps the scope small to prioritize correctness and server-side business rules.

Known gaps:

* The frontend is intentionally minimal and does not focus on visual polish.
* There are no email or notification workflows.
* There is no production deployment because deployment is not required for the task.
* Pagination uses limit/offset rather than cursor-based pagination.
* There is no full OpenAPI/Swagger specification.
* The application does not include advanced audit logging beyond approval decision history.

With additional development time, I would consider:

* More comprehensive integration tests
* A dedicated service layer for lifecycle transitions
* Better frontend UX and responsive styling
* OpenAPI documentation
* CI checks
* More extensive audit logging

---

## 17. AI Usage Disclosure

AI assistance was used during development for guidance, debugging and test-case design.

The final implementation was tested locally, including lifecycle, authorization, security and edge-case scenarios.

I understand the submitted code and can explain the design decisions, validation rules, authorization checks, database structure and lifecycle behavior.

---

## 18. Running the Application

Use two terminals.

### Terminal 1 — Backend

```bash
cd field-visit-permit-platform/Backend
npm install
npm run dev
```

### Terminal 2 — Frontend

```bash
cd field-visit-permit-platform/Frontend
npm install
npm run dev
```

Then open the frontend URL displayed by Vite.

---

## 19. Git History

The repository contains incremental commits for the major implementation stages, including:

* Project setup
* Database schema
* Seed data
* Authentication
* Authorization
* Visit APIs
* Lifecycle rules
* Summary API
* Frontend functionality
* Automated tests
* Security hardening
* Documentation

The commit history is intentionally kept readable so the development progression can be understood.
