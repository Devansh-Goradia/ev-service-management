# ⚡ Electric Vehicle Service Management Platform

A full-stack web application designed for electric vehicle owners to register accounts, manage their vehicles, book scheduled maintenance services, and track service records.

> **Academic Course**: Database Management Systems (DBMS) Laboratory / Course Project  
> **Key Focus**: Relational database architecture, foreign key constraints, referential integrity, multi-table `JOIN` queries, aggregate calculations (`GROUP BY`, `COUNT`, `AVG`), and RESTful API integration.  
> **Scope**: Service and maintenance management portal (not an e-commerce catalogue or vehicle sales platform).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js (Vite), JavaScript (ES6+), React Router DOM, Custom CSS (Light theme), Lucide React Icons |
| **Backend** | Python 3.10+, FastAPI, Uvicorn (ASGI), SQLAlchemy 2.0 ORM, Pydantic v2, Python-Jose (JWT Auth), Bcrypt |
| **Database** | PostgreSQL 15+, pgAdmin 4 |
| **Version Control** | Git & GitHub |

---

## 🏛️ System Architecture

```text
React.js (Port 5173) ──[HTTP / JSON]──► FastAPI (Port 8000) ──► SQLAlchemy ORM ──► PostgreSQL (Port 5432)
```
- The frontend communicates strictly via the REST API layer (`Fetch API`).
- The frontend **never** connects directly to PostgreSQL.
- Passwords are securely hashed with `bcrypt` (never stored in plaintext).
- Authentication uses signed JSON Web Tokens (JWT) with user-scoped data access.

---

## 🗄️ Relational Database Design

The PostgreSQL database `ev_service_db` consists of 5 normalized relational tables:

```mermaid
erDiagram
    users ||--o{ vehicles : "owns (1:N)"
    vehicles ||--o{ service_requests : "books (1:N)"
    service_types ||--o{ service_requests : "categorizes (1:N)"

    users {
        UUID user_id PK
        VARCHAR full_name
        VARCHAR email UK
        VARCHAR phone
        VARCHAR password_hash
        BOOLEAN is_admin
        TIMESTAMP created_at
    }

    vehicles {
        UUID vehicle_id PK
        UUID user_id FK
        VARCHAR manufacturer
        VARCHAR model
        VARCHAR registration_number UK
        INTEGER purchase_year
    }

    service_types {
        UUID service_type_id PK
        VARCHAR service_name
        TEXT description
    }

    service_requests {
        UUID service_id PK
        UUID vehicle_id FK
        UUID service_type_id FK
        TIMESTAMP requested_date
        TEXT issue_description
        VARCHAR status
        TIMESTAMP created_at
    }

    indian_ev_catalog {
        UUID model_id PK
        VARCHAR manufacturer
        VARCHAR model_name
        NUMERIC battery_capacity_kwh
        INTEGER claimed_range_km
        VARCHAR body_type
        VARCHAR price_range_inr_lakh
        BOOLEAN fast_charging_support
    }
```

### Table Specifications & Constraints

1. **`users`**
   - `user_id` (UUID, Primary Key)
   - `email` (VARCHAR, Unique Constraint, Index)
   - `password_hash` (TEXT, Bcrypt salted hash)
   - `is_admin` (BOOLEAN, Role-based access control)

2. **`vehicles`**
   - `vehicle_id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key referencing `users(user_id)` ON DELETE CASCADE)
   - `registration_number` (VARCHAR, Unique Constraint — prevents duplicate registrations)

3. **`service_types`**
   - Pre-seeded catalogue containing: *Battery Checkup*, *General Maintenance*, *Brake Inspection*, *Tire Inspection*, *Software Diagnostics*.

4. **`service_requests`**
   - `service_id` (UUID, Primary Key)
   - `vehicle_id` (UUID, Foreign Key referencing `vehicles(vehicle_id)`)
   - `service_type_id` (UUID, Foreign Key referencing `service_types(service_type_id)`)
   - `status` (`Pending`, `In Progress`, `Completed`)

5. **`indian_ev_catalog`**
   - Master technical reference table containing 28 popular Indian market electric cars (Tata Motors, Mahindra, MG, BYD, Hyundai, Kia, etc.) used for model suggestions and aggregate queries.

---

## 💡 DBMS Viva Demonstration Queries

Below are key SQL queries implemented and demonstrated in this project:

### 1. Multi-Table Relational JOIN (Users + Vehicles + Services)
```sql
SELECT 
    u.full_name AS customer_name,
    u.phone AS contact_number,
    v.manufacturer,
    v.model,
    v.registration_number,
    st.service_name,
    sr.requested_date,
    sr.status
FROM service_requests sr
JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
JOIN users u ON v.user_id = u.user_id
JOIN service_types st ON sr.service_type_id = st.service_type_id
ORDER BY sr.requested_date DESC;
```

### 2. Aggregations with `GROUP BY` and `COUNT()`
```sql
-- Count services booked per vehicle
SELECT 
    v.manufacturer,
    v.model,
    v.registration_number,
    COUNT(sr.service_id) AS total_services_booked
FROM vehicles v
LEFT JOIN service_requests sr ON v.vehicle_id = sr.vehicle_id
GROUP BY v.vehicle_id, v.manufacturer, v.model, v.registration_number
ORDER BY total_services_booked DESC;
```

### 3. Filtered Search with `WHERE` Clause
```sql
-- Display all pending maintenance requests
SELECT 
    sr.service_id,
    v.registration_number,
    st.service_name,
    sr.requested_date,
    sr.status
FROM service_requests sr
JOIN vehicles v ON sr.vehicle_id = v.vehicle_id
JOIN service_types st ON sr.service_type_id = st.service_type_id
WHERE sr.status = 'Pending'
ORDER BY sr.requested_date ASC;
```

### 4. Aggregate Statistics on Master Catalogue
```sql
-- Calculate model count and average claimed range per brand
SELECT 
    manufacturer,
    COUNT(model_id) AS total_models,
    ROUND(AVG(claimed_range_km), 1) AS average_range_km
FROM indian_ev_catalog
GROUP BY manufacturer
ORDER BY total_models DESC;
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ and npm
- PostgreSQL 15+ and pgAdmin 4

### 1. Database Setup
1. Open pgAdmin 4 or `psql` and create the database:
   ```sql
   CREATE DATABASE ev_service_db;
   ```
2. The backend will automatically create all tables and seed service types upon initial startup.

### 2. Backend Setup (FastAPI)
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and adjust credentials if needed:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ev_service_db

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs (Swagger UI): **`http://localhost:8000/docs`**
- DB Health Check: **`http://localhost:8000/health/db`**

### 3. Frontend Setup (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Web Application: **`http://localhost:5173`**

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account | No |
| `POST` | `/auth/login` | Authenticate user & return JWT | No |
| `GET` | `/auth/me` | Fetch active user credentials | Yes |
| `GET` | `/vehicles` | List vehicles owned by current user | Yes |
| `POST` | `/vehicles` | Register a new vehicle | Yes |
| `PUT` | `/vehicles/{id}` | Update existing vehicle | Yes |
| `DELETE` | `/vehicles/{id}` | Delete vehicle (cascade service records) | Yes |
| `GET` | `/service-types` | List available service packages | No |
| `GET` | `/services` | Fetch service records of current user | Yes |
| `POST` | `/services` | Book a new service request | Yes |
| `PATCH` | `/services/{id}/status` | Update booking status (`Pending`/`In Progress`/`Completed`) | Admin |
| `GET` | `/dashboard/stats` | Summary KPI metrics for user dashboard | Yes |
| `GET` | `/indian-evs` | Searchable catalogue of Indian EV specifications | No |
| `GET` | `/health/db` | Healthcheck testing PostgreSQL connection | No |

---

## 🔑 Demo Account Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Demo Customer** | `aarav@evservice.in` | `password123` |
| **Admin** | `admin@evservice.com` | `admin123` |

---

## 📁 Repository Structure

```text
ev-service-management/
├── backend/
│   ├── app/
│   │   ├── auth.py              # JWT tokens, bcrypt password hashing & dependencies
│   │   ├── database.py          # SQLAlchemy engine, session maker & get_db
│   │   ├── main.py              # FastAPI app, CORS, table creation & seeding
│   │   ├── models.py            # SQLAlchemy ORM relational models
│   │   ├── schemas.py           # Pydantic v2 validation schemas
│   │   └── routes/
│   │       ├── indian_evs.py    # Master EV reference catalogue routes
│   │       ├── services.py      # Booking & status endpoints
│   │       ├── users.py         # Authentication & profile routes
│   │       └── vehicles.py      # Vehicle CRUD routes
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py                  # Entrypoint alias
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Responsive navigation bar
│   │   │   └── ServiceTable.jsx # Service records table with status badges
│   │   ├── pages/
│   │   │   ├── Welcome.jsx      # Landing page
│   │   │   ├── Register.jsx     # User registration
│   │   │   ├── Login.jsx        # User login
│   │   │   ├── Home.jsx         # Dashboard with metrics
│   │   │   ├── Garage.jsx       # Vehicle CRUD & autocomplete
│   │   │   ├── BookService.jsx  # Service booking form
│   │   │   ├── Services.jsx     # Service records & status filter
│   │   │   ├── IndianEVs.jsx    # Indian EV reference DB & SQL demo
│   │   │   └── Account.jsx      # Profile management
│   │   ├── services/
│   │   │   └── api.js           # Reusable fetch client
│   │   ├── App.jsx              # Routes & ProtectedRoute
│   │   └── main.jsx             # React entry point
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── docs/
│   └── er_diagram.html          # Interactive standalone ER diagram
├── .gitignore
└── README.md
```
