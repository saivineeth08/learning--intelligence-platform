PROJECT_SPEC.md
1. Project Overview
Project Name

Learning Intelligence Platform

Project Type

Production-oriented full-stack web application with AI capabilities.

Primary Objective

Build a centralized platform that helps users plan, execute, track, and improve their learning.

The platform combines:

Learning goals
Task management
Study-session tracking
Learning resources
Notes
Analytics
Search
Rule-based recommendations
AI-powered document interaction
AI-generated quizzes
Personalized learning guidance

The initial version should be designed as a modular monolithic application that can later evolve into independently scalable services if required.

2. Problem Statement

Students and self-learners commonly use multiple disconnected tools:

Notion       → Notes
Todo apps    → Tasks
YouTube      → Learning
PDFs         → Resources
Excel        → Tracking
Timer apps   → Study sessions
ChatGPT      → Questions

This creates fragmented learning data.

The Learning Intelligence Platform brings these activities together.

The system should answer questions such as:

What am I currently learning?
What should I study today?
How much time did I spend studying?
Which goals are progressing?
Which tasks are overdue?
What resources belong to a goal?
What have I learned from a particular document?
Can I ask questions about my uploaded PDF?
Can the system generate a quiz from my learning material?
What should I focus on next?
3. Target Users
Primary User

A student or self-learner who manages multiple learning objectives.

Example:

Goal:
Master Data Structures & Algorithms

Tasks:
- Arrays
- Binary Search
- Trees
- Graphs

Resources:
- DSA PDF
- YouTube course
- Articles

Study Sessions:
- 90 minutes DSA
- 60 minutes problem solving

Notes:
- Binary tree patterns
- Sliding window patterns
4. Product Principles

The application should follow these principles:

4.1 User Ownership

Users can access and modify only their own learning data.

4.2 Simplicity

The application should remain easy to use despite having many features.

4.3 Modular Architecture

Features should be isolated into logical modules.

4.4 API-First Backend

The backend exposes REST APIs consumed by the React frontend.

4.5 Security by Default

Authentication, authorization, validation, secure password handling, and safe file handling are mandatory.

4.6 Production-Oriented Engineering

The system should include:

Validation
Error handling
Testing
Logging
Documentation
Environment configuration
Docker
CI/CD
Deployment readiness
4.7 AI as an Enhancement

Core learning functionality must work without AI.

AI should enhance the product rather than become a dependency for basic functionality.

5. Technology Stack
Frontend
React
Vite
JavaScript initially
React Router
Axios
Tailwind CSS

Optional libraries may be introduced when justified.

Backend
Python
Django
Django REST Framework
Simple JWT
Database
PostgreSQL
Caching / Background Processing
Redis
Celery

These should be introduced when required by asynchronous workloads.

AI

Initial architecture should support:

LLM API
Embedding Model
Vector Database
RAG Pipeline
Document Processing

The exact provider should be configurable through environment variables rather than hard-coded.

Infrastructure
Docker
Docker Compose
GitHub
GitHub Actions

Cloud provider can be selected during deployment based on cost and suitability.

6. High-Level Architecture
                         USER
                          │
                          ▼
                    React Frontend
                          │
                       HTTPS
                          │
                          ▼
                  Django REST API
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
      PostgreSQL        Redis           AI Layer
          │                                │
          │                         ┌──────┴──────┐
          │                         │             │
          │                       LLM       Vector DB
          │
          ▼
       Persistent
         Data
7. Backend Architecture

Use a modular Django architecture.

backend/
│
├── config/
│
├── users/
├── goals/
├── tasks/
├── studies/
├── resources/
├── notes/
├── analytics/
├── search/
├── ai/
│
├── manage.py
└── requirements.txt

Each domain should have clear responsibilities.

8. Backend Layering

Major modules should follow:

Request
   ↓
URL
   ↓
View
   ↓
Serializer
   ↓
Service
   ↓
Model / Repository logic
   ↓
Database
View

Responsible primarily for HTTP concerns.

Serializer

Responsible for:

Input validation
Serialization
Deserialization
Service

Responsible for business logic.

Model

Responsible for database representation and model-level constraints.

Do not put large business workflows inside views.

9. Database Design
User

Django custom user model based on AbstractUser.

Important fields:

id
username
email
password
first_name
last_name
is_active
date_joined
created_at
updated_at

Email should be unique.

Passwords must always be hashed.

10. Goal

Represents a learning objective.

Fields:

id
user
title
description
category
status
priority
target_date
created_at
updated_at

Possible status:

ACTIVE
COMPLETED
ARCHIVED

Possible priority:

LOW
MEDIUM
HIGH

Relationship:

User 1 ─────── N Goals
11. Task

Represents an actionable unit of work.

Fields:

id
goal
user
title
description
status
priority
due_date
completed_at
created_at
updated_at

Status:

TODO
IN_PROGRESS
COMPLETED
CANCELLED

Relationship:

Goal 1 ─────── N Tasks
User 1 ─────── N Tasks
12. Study Session

Represents actual learning time.

Fields:

id
user
goal
task
started_at
ended_at
duration_seconds
notes
created_at

A session may optionally belong to a task.

Example:

Goal:
Learn DSA

Task:
Binary Trees

Session:
2026-08-19
90 minutes

The server should calculate duration rather than trusting arbitrary client-provided duration where possible.

13. Resources

Resources represent external or uploaded learning material.

Types:

PDF
LINK
VIDEO
ARTICLE
DOCUMENT

Fields:

id
user
goal
task
title
description
resource_type
url
file
created_at
updated_at

Uploaded files must be associated with their owner.

Users must never be able to access another user's private files.

14. Notes

Fields:

id
user
goal
task
resource
title
content
created_at
updated_at

Relationships should be optional where appropriate.

A note may belong to:

A goal
A task
A resource
15. Analytics

Analytics should initially be calculated from existing data rather than duplicating data unnecessarily.

Metrics include:

Total study time
Daily study time
Weekly study time
Monthly study time
Completed tasks
Pending tasks
Overdue tasks
Goal completion percentage
Study streak
Resource usage

Dashboard example:

Today's Study Time
Weekly Study Time
Active Goals
Completed Tasks
Pending Tasks
Current Streak
16. Search

Search should initially support:

Goals
Tasks
Resources
Notes

Later, AI-powered semantic search can be introduced.

Initial implementation may use PostgreSQL search capabilities.

17. Authentication

Authentication must support:

Registration
Login
Access Token
Refresh Token
Logout
Profile
Change Password

JWT-based authentication will be used.

Authentication flow:

Login
 ↓
Django validates credentials
 ↓
Access Token
+
Refresh Token
 ↓
Frontend
 ↓
Protected API requests
 ↓
Authorization
18. Authorization

Every protected endpoint must verify ownership.

Example:

User A requests Goal B
       ↓
Does Goal B belong to User A?
       ↓
No
       ↓
403/404

Never rely solely on frontend filtering.

Authorization must be enforced server-side.

19. API Standards

Base API:

/api/

Authentication:

/api/auth/

Goals:

/api/goals/

Tasks:

/api/tasks/

Study:

/api/studies/

Resources:

/api/resources/

Notes:

/api/notes/

Analytics:

/api/analytics/

Search:

/api/search/

AI:

/api/ai/
20. API Response Standards

Successful responses should use appropriate HTTP status codes.

Examples:

200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error

Validation errors should be structured consistently.

21. Registration API
POST /api/auth/register/

Request:

{
  "username": "saivineeth",
  "email": "user@example.com",
  "first_name": "Sai",
  "last_name": "Vineeth",
  "password": "StrongPassword123!"
}

Password must never be returned.

22. Login API
POST /api/auth/login/

Request:

{
  "username": "saivineeth",
  "password": "StrongPassword123!"
}

Response contains:

access
refresh

Token handling must follow secure frontend practices.

23. Profile API
GET /api/auth/profile/
PATCH /api/auth/profile/

Users can view/update permitted profile information.

Sensitive fields must not be exposed.

24. Change Password
POST /api/auth/change-password/

Request:

{
  "old_password": "...",
  "new_password": "..."
}

The old password must be verified before changing it.

25. Logout

JWT logout should be implemented using an appropriate token invalidation/blacklisting strategy.

The implementation must be documented because JWT access tokens are otherwise stateless.

26. Goal APIs
GET    /api/goals/
POST   /api/goals/
GET    /api/goals/{id}/
PATCH  /api/goals/{id}/
DELETE /api/goals/{id}/

Only authenticated users may access these endpoints.

27. Task APIs
GET    /api/tasks/
POST   /api/tasks/
GET    /api/tasks/{id}/
PATCH  /api/tasks/{id}/
DELETE /api/tasks/{id}/

Support filtering by:

goal
status
priority
due date
28. Study APIs
GET  /api/studies/
POST /api/studies/
GET  /api/studies/{id}/

Additional endpoints can support:

start session
stop session

depending on final implementation.

29. Resource APIs
GET    /api/resources/
POST   /api/resources/
GET    /api/resources/{id}/
PATCH  /api/resources/{id}/
DELETE /api/resources/{id}/

Support file uploads.

30. Notes APIs
GET    /api/notes/
POST   /api/notes/
GET    /api/notes/{id}/
PATCH  /api/notes/{id}/
DELETE /api/notes/{id}/
31. Analytics APIs

Example:

GET /api/analytics/dashboard/
GET /api/analytics/study-time/
GET /api/analytics/goals/
GET /api/analytics/tasks/

Analytics should be derived from authoritative application data.

32. Frontend Architecture
frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   ├── routes/
│   ├── assets/
│   └── App.jsx
│
├── public/
└── package.json
33. Frontend Pages

Initial pages:

Landing Page
Login
Register
Dashboard
Goals
Goal Details
Tasks
Study Sessions
Resources
Notes
Analytics
Profile
Settings

AI pages:

Document Chat
Quiz Generator
AI Recommendations
34. Dashboard

The dashboard should show:

Welcome
Today's Tasks
Active Goals
Today's Study Time
Weekly Study Time
Current Streak
Recent Resources
Recent Notes
AI Recommendations
35. State Management

Start simple.

Use React state/context where appropriate.

Introduce a dedicated state-management library only if application complexity justifies it.

Avoid unnecessary global state.

36. API Client

Create a centralized API client.

Responsibilities:

Base URL
Authentication headers
Error handling
Token refresh
Request configuration

Do not duplicate Axios configuration across every component.

37. AI Architecture

AI should be modular.

User
 ↓
AI API
 ↓
AI Service
 ↓
Retrieval / Prompt Construction
 ↓
LLM
 ↓
Response
38. RAG Pipeline

For uploaded documents:

PDF Upload
    ↓
Text Extraction
    ↓
Cleaning
    ↓
Chunking
    ↓
Embedding
    ↓
Vector Database

Question:

User Question
    ↓
Embedding
    ↓
Similarity Search
    ↓
Relevant Chunks
    ↓
Prompt
    ↓
LLM
    ↓
Answer

The system should return answers grounded in retrieved content.

39. AI Document Chat

Users can ask questions about their uploaded resources.

Requirements:

Only authorized documents can be queried.
Retrieved chunks must respect ownership.
Context limits must be considered.
LLM failures must be handled gracefully.
AI responses should not be presented as guaranteed truth.
40. Quiz Generation

Input:

Resource

Output:

Question
Options
Correct Answer
Explanation
Difficulty

Potential question types:

MCQ
True/False
Short Answer

Initial implementation should prioritize MCQs.

41. Recommendation Engine

Start with deterministic/rule-based recommendations.

Examples:

Overdue tasks
    ↓
Recommend completing overdue task

Low study activity
    ↓
Recommend study session

Goal approaching deadline
    ↓
Increase priority

Repeatedly incomplete tasks
    ↓
Suggest breaking task into smaller tasks

AI recommendations can be added later.

This ensures the application remains functional without an LLM.

42. Security Requirements

Mandatory:

Password hashing
JWT authentication
Authorization
Input validation
CSRF considerations
CORS configuration
Secure environment variables
File validation
File size limits
SQL injection protection
Rate limiting where appropriate
Secure production cookies/tokens
HTTPS in production

Never commit:

.env
API keys
Passwords
Secrets
Private credentials
43. File Upload Security

Uploaded files must have:

Allowed file types
Maximum file size
Safe filename handling
Ownership validation
Storage isolation

Never trust file extensions alone.

44. Error Handling

Backend should return consistent errors.

Internal exceptions must not expose:

Stack traces
Database details
Secrets
Internal architecture

Production DEBUG must be disabled.

45. Logging

Implement structured logging for important events.

Examples:

Authentication failures
API errors
File processing failures
AI failures
Background task failures
Important business events

Never log passwords, tokens, or sensitive user data.

46. Testing Strategy

Testing layers:

Unit Tests
     ↓
Service Tests
     ↓
API Tests
     ↓
Integration Tests
     ↓
Frontend Tests
     ↓
End-to-End Tests

Critical functionality must have automated tests.

Minimum important areas:

Authentication
Authorization
CRUD
Ownership
File uploads
Analytics
AI processing
47. Docker

Development environment should eventually support:

Frontend
Backend
PostgreSQL
Redis

AI/vector infrastructure can be added depending on the selected provider.

Use environment variables for configuration.

48. Environment Configuration

Example:

DEBUG=
SECRET_KEY=
DATABASE_URL=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

JWT settings

REDIS_URL=

AI_API_KEY=
AI_MODEL=
EMBEDDING_MODEL=
VECTOR_DATABASE_URL=

Actual secrets must never be committed.

Provide:

.env.example

instead.

49. Git Strategy

Use meaningful commits.

Examples:

feat(auth): implement registration
feat(goals): add goal CRUD
feat(tasks): add task management
feat(ai): implement document ingestion
fix(auth): handle token refresh failure
test(goals): add ownership tests

Branches:

main
develop
feature/*
fix/*

Exact branching strategy may be simplified if the project is maintained individually.

50. CI/CD

GitHub Actions should eventually perform:

Install dependencies
↓
Lint
↓
Run backend tests
↓
Run frontend tests
↓
Build frontend
↓
Build Docker images

Deployment should occur only after successful checks.

51. Production Environment

The final deployment should contain:

Frontend
Backend API
PostgreSQL
Redis
Background workers
Object/file storage
AI services

All communication should use HTTPS.

52. Observability

Production should provide:

Application logs
Error tracking
Health checks
Database monitoring
API performance metrics

At minimum:

GET /health/

should verify basic application health.

53. Performance Requirements

The initial application should prioritize correctness.

Then optimize:

Database indexes
Query optimization
Pagination
Caching
N+1 query prevention
Async processing
File processing
AI latency

Do not prematurely introduce microservices.

54. Architecture Decision
Start as a Modular Monolith

We will not begin with microservices.

Why?

Modular Monolith
    ↓
Simpler development
    ↓
Simpler deployment
    ↓
Lower infrastructure complexity
    ↓
Clear module boundaries

If scale later requires it, individual modules can be extracted.

This demonstrates an important engineering principle:

Don't introduce distributed-system complexity before the product requires it.

55. AI Provider Abstraction

AI provider integrations should be isolated.

Bad:

views.py
    ↓
Direct OpenAI API call everywhere

Better:

AI Service
    ↓
Provider abstraction
    ↓
LLM provider

This allows the provider/model to be changed without rewriting the application.

