# Learning Intelligence Platform

Production-oriented full-stack application for planning, tracking, and improving learning.

This repository currently includes **Milestone 1 — Foundation** only.

## Stack

- Backend: Python, Django, Django REST Framework
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

The `users` app contains only the custom user model required before the first
migration. Authentication APIs belong to Milestone 2 and are not implemented yet.

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

The app runs at `http://localhost:5173` and calls the backend health endpoint
through the centralized Axios client.

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

Milestone 2 — Authentication (registration, login, JWT, profile, password change).
