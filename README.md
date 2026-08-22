# Learning Intelligence Platform

Production-oriented full-stack application for planning, tracking, and improving learning.

Features: learning goals · tasks · study sessions · resources · notes · analytics · AI document chat · AI quiz generation · rule-based recommendations · global search.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, React Router, Axios, Tailwind CSS |
| Backend | Python 3.12, Django 5, Django REST Framework |
| Auth | Simple JWT (access + refresh + blacklist) |
| Database | PostgreSQL |
| AI | Provider abstraction (mock · OpenAI) |
| Infrastructure | Docker Compose (dev + prod), GitHub Actions CI |

## Milestones

| # | Milestone | Status |
|---|---|---|
| 1 | Project foundation | ✅ |
| 2 | Authentication & users | ✅ |
| 3 | Goals, tasks, study sessions | ✅ |
| 4 | Resources & notes | ✅ |
| 5 | Analytics & dashboard | ✅ |
| 6 | AI document intelligence (RAG, chat, quizzes) | ✅ |
| 7 | Search, recommendations, production hardening | ✅ |

## Repository layout

```text
backend/        Django project
  config/       Settings (base / development / production)
  core/         Health check, custom exception handler
  users/        Auth, JWT, profile
  goals/        Learning goals
  tasks/        Task management
  studies/      Study session tracking
  resources/    File uploads & external links
  notes/        Rich notes
  analytics/    Dashboard & study-time analytics
  search/       Cross-model full-text search
  ai/           Document intelligence, RAG, chat, quizzes, recommendations

frontend/
  src/
    pages/      All application pages
    services/   Centralised Axios API modules
    context/    AuthContext
    layouts/    MainLayout, ProtectedRoute
    routes/     React Router config

docker-compose.yml        Development compose (runserver / npm run dev)
docker-compose.prod.yml   Production compose (gunicorn + nginx)
.env.example              All environment variable templates
```

## Prerequisites

- Python 3.12+
- Node.js 22+
- PostgreSQL 16+ (or Docker)
- Docker and Docker Compose (recommended)

## Environment configuration

```bash
cp .env.example .env
# Fill in SECRET_KEY, POSTGRES_*, and VITE_API_URL
```

Key variables:

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `POSTGRES_DB / USER / PASSWORD` | Database credentials |
| `DATABASE_URL` | Full connection string (alternative to individual vars) |
| `ALLOWED_HOSTS` | Comma-separated hostname list |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `VITE_API_URL` | Backend URL for the React frontend |
| `AI_PROVIDER` | `mock` (default) or `openai` |
| `AI_API_KEY` | OpenAI API key (only when `AI_PROVIDER=openai`) |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `JWT_ACCESS_TOKEN_MINUTES` | Default: `15` |
| `JWT_REFRESH_TOKEN_DAYS` | Default: `7` |

## Local setup (without Docker)

### 1. PostgreSQL

```sql
CREATE USER lip WITH PASSWORD 'your-password';
CREATE DATABASE learning_intelligence OWNER lip;
```

### 2. Backend

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate  # macOS / Linux
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py check
python manage.py test       # must show 0 failures
python manage.py runserver
```

Health check:

```text
GET http://localhost:8000/health/
→ {"status": "ok", "database": "ok"}
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

## Docker Compose — development

```bash
cp .env.example .env
docker compose up --build

# First run — apply migrations
docker compose exec backend python manage.py migrate
```

Services: frontend `http://localhost:5173` · backend `http://localhost:8000` · PostgreSQL `5432`

## Docker Compose — production

```bash
# Edit .env for production values (DEBUG=False, strong SECRET_KEY, ALLOWED_HOSTS, etc.)
docker compose -f docker-compose.prod.yml up --build -d
```

The production compose uses:
- **gunicorn** (4 workers) for the backend
- **nginx** to serve the React build
- Auto-runs `migrate` and `collectstatic` on backend startup

## API reference

### Auth — `/api/auth/`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | No | Register |
| POST | `/api/auth/login/` | No | JWT login |
| POST | `/api/auth/refresh/` | No | Rotate refresh token |
| POST | `/api/auth/logout/` | Yes | Blacklist refresh token |
| GET/PATCH | `/api/auth/profile/` | Yes | View / update profile |
| POST | `/api/auth/change-password/` | Yes | Change password |

### Learning — `/api/`

| Method | Path | Description |
|---|---|---|
| CRUD | `/api/goals/` | Learning goals |
| CRUD | `/api/tasks/` | Tasks (filter by goal, status, priority, due date) |
| CRUD | `/api/studies/` | Study sessions |
| CRUD | `/api/resources/` | Resources (file upload + links) |
| CRUD | `/api/notes/` | Notes |

### Analytics — `/api/analytics/`

| Path | Description |
|---|---|
| `/api/analytics/dashboard/` | Dashboard summary |
| `/api/analytics/study-time/` | Study-time breakdown |
| `/api/analytics/goals/` | Goal analytics |
| `/api/analytics/tasks/` | Task analytics |

### Search — `/api/search/`

| Path | Query params | Description |
|---|---|---|
| `/api/search/` | `q` (required, min 2 chars), `type` (optional: `goal,task,resource,note`) | Full-text search |

### AI — `/api/ai/`

| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/documents/index/` | Index a resource into document chunks |
| GET | `/api/ai/documents/{id}/status/` | Check indexing status |
| GET/POST | `/api/ai/chat/sessions/` | List / create chat sessions |
| GET | `/api/ai/chat/sessions/{id}/` | Get session with messages |
| POST | `/api/ai/chat/sessions/{id}/messages/` | Send message (RAG-grounded) |
| GET/POST | `/api/ai/quizzes/` | List / generate quizzes |
| GET | `/api/ai/quizzes/{id}/` | Quiz detail |
| GET | `/api/ai/recommendations/` | Rule-based recommendations |

### Health — `/health/`

```text
GET /health/
→ {"status": "ok", "database": "ok"}
```

## Authentication notes

JWT logout blacklists the **refresh** token via Simple JWT's blacklist app.

- Access tokens remain valid until expiry (`JWT_ACCESS_TOKEN_MINUTES`).
- Changing password revokes all refresh tokens for the user.
- Refresh token rotation is enabled — each refresh returns a new token and blacklists the old one.

## AI provider

The AI layer uses a provider abstraction so you can switch LLMs without rewriting the application.

```
AI_PROVIDER=mock      # safe default — no external calls, deterministic responses
AI_PROVIDER=openai    # requires AI_API_KEY
```

Document indexing flow: upload PDF → text extraction → chunking → embedding → vector store.
Chat: user question → embedding → similarity search → context → LLM → grounded answer.

## Tests & CI

```bash
# Run all backend tests
cd backend
python manage.py test

# Frontend production build
cd frontend
npm run build
```

GitHub Actions runs on every push to `main`, `master`, or `develop`:
1. Install dependencies
2. Django system checks
3. Apply migrations
4. Run all backend tests against PostgreSQL
5. Frontend production build

## Performance

Database indexes are defined on the following high-traffic query fields:

| Model | Indexed fields |
|---|---|
| Goal | `user + status`, `user + priority` |
| Task | `user + status`, `user + goal`, `user + due_date` |
| StudySession | `user + started_at`, `user + goal` |
| Resource | `user + created_at`, `user + goal` |
| Note | `user + created_at`, `user + goal` |

## Security

- Passwords hashed by Django (PBKDF2-SHA256)
- JWT with short-lived access tokens and blacklisted refresh tokens
- Server-side ownership isolation on all endpoints
- File upload validation (type, size, safe path)
- Production: HSTS, SSL redirect, secure cookies, `X-Frame-Options: DENY`
- `DEBUG=False` enforced in production settings
- Secrets via environment variables; `.env` is git-ignored
