# Learning Intelligence Platform

Production-oriented full-stack application for planning, tracking, and improving learning.

This repository currently includes **Milestone 1 — Foundation** and **Milestone 2 — Authentication**.

## Stack

- Backend: Python, Django, Django REST Framework, Simple JWT
- Frontend: React, Vite, JavaScript, React Router, Axios, Tailwind CSS
- Database: PostgreSQL
- Infrastructure: Docker Compose (backend, frontend, PostgreSQL)

## Repository layout

```text
backend/     Django project (`config`, `core`, `users`)
frontend/    React + Vite application
.env.example Environment variable template
docker-compose.yml
```

The `users` app owns the custom user model and authentication APIs.

## Prerequisites

- Python 3.12+
- Node.js 22+
- PostgreSQL 16+ (or Docker)
- Docker and Docker Compose (optional, recommended)

## Environment configuration

Copy the example file and replace placeholder values. Do not commit `.env`.

```bash
cp .env.example .env
```

Required variables:

- `SECRET_KEY`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DATABASE_URL` (or the individual `POSTGRES_*` values)
- `VITE_API_URL` (frontend)

Optional JWT overrides:

- `JWT_ACCESS_TOKEN_MINUTES` (default `15`)
- `JWT_REFRESH_TOKEN_DAYS` (default `7`)
- `JWT_SIGNING_KEY` (falls back to `SECRET_KEY`)

## Local setup without Docker

### 1. PostgreSQL

Create a database and user that match `.env`, for example:

```sql
CREATE USER lip WITH PASSWORD 'your-password';
CREATE DATABASE learning_intelligence OWNER lip;
```

### 2. Backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py check
python manage.py test
python manage.py runserver
```

Health check:

```text
GET http://localhost:8000/health/
```

Expected response when the database is reachable:

```json
{"status": "ok", "database": "ok"}
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and uses the centralized Axios client for health checks and authentication.

## Authentication

Base path: `/api/auth/`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register/` | No | Create a user |
| POST | `/api/auth/login/` | No | Return access and refresh JWTs |
| POST | `/api/auth/refresh/` | No | Rotate refresh token and return a new access token |
| POST | `/api/auth/logout/` | Yes | Blacklist the provided refresh token |
| GET | `/api/auth/profile/` | Yes | Current user's safe profile |
| PATCH | `/api/auth/profile/` | Yes | Update permitted profile fields |
| POST | `/api/auth/change-password/` | Yes | Change password and revoke refresh tokens |

Login uses `username` and `password`.

Protected profile fields such as `username`, `password`, `is_staff`, and `is_superuser` cannot be changed through `PATCH /api/auth/profile/`.

### JWT logout behavior

Access tokens are stateless JWTs. Logout blacklists the **refresh** token using Simple JWT's token blacklist app.

- A blacklisted refresh token cannot be used to obtain new access tokens.
- An existing access token remains valid until it expires (`JWT_ACCESS_TOKEN_MINUTES`).
- Changing a password blacklists all outstanding refresh tokens for that user.
- Refresh token rotation is enabled: each refresh returns a new refresh token and blacklists the previous one.

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- PostgreSQL: port `5432`

On first backend start, run migrations:

```bash
docker compose exec backend python manage.py migrate
```

## Tests and CI

Backend tests use Django's test runner and PostgreSQL.

GitHub Actions runs:

1. Django system checks
2. Backend tests against PostgreSQL
3. Frontend production build

## Next milestone

Milestone 3 — Learning Management (goals, tasks, study sessions).
