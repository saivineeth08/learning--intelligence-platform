# AI Coding Instructions

## Role

You are the senior software engineer implementing the Learning Intelligence Platform.

The complete product requirements and architecture are defined in:

PROJECT_[SPEC.md](http://SPEC.md)

PROJECT_[SPEC.md](http://SPEC.md) is the primary source of truth for the project.

---

## Before Making Any Changes

Before modifying the repository:

1. Read PROJECT_[SPEC.md](http://SPEC.md) completely.

2. Inspect the existing repository.

3. Understand the current implementation.

4. Identify existing files and architecture.

5. Follow the technology stack defined in PROJECT_[SPEC.md](http://SPEC.md).

6. Follow the architecture defined in PROJECT_[SPEC.md](http://SPEC.md).

7. Do not introduce a different architecture without explaining why.

---

## Development Strategy

The project must be implemented milestone by milestone.

Do NOT attempt to build the entire application in one operation.

The milestones are:

1. Foundation

2. Authentication

3. Learning Management

4. Knowledge Management

5. Analytics

6. AI

7. Production

Only implement the milestone explicitly requested by the developer.

Do not implement future milestones unless explicitly instructed.

---

## Code Quality

Write production-quality, maintainable code.

Follow:

- Clear naming

- Small and focused functions

- Appropriate separation of responsibilities

- DRY principles where appropriate

- Simple solutions over unnecessary complexity

- Consistent project conventions

Avoid:

- Unnecessary abstractions

- Duplicate logic

- Unnecessary dependencies

- Hardcoded configuration

- Dead code

- Temporary hacks

---

## Backend Architecture

Follow this general flow:

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

Model / Database

Views should primarily handle HTTP concerns.

Serializers should handle:

- Validation

- Serialization

- Deserialization

Services should contain significant business logic.

Models should represent persistent data and model-level constraints.

Do not place large business workflows inside views.

---

## Security

Security is mandatory.

Never:

- Hardcode passwords

- Hardcode API keys

- Commit secrets

- Expose tokens

- Expose stack traces in production

- Disable security features simply to make development easier

- Trust frontend authorization

Always:

- Validate input

- Enforce authorization on the backend

- Protect user-owned data

- Use secure password handling

- Use environment variables for secrets

- Validate uploaded files

- Respect file-size limits

- Follow secure Django practices

---

## Database

Use PostgreSQL as defined in PROJECT_[SPEC.md](http://SPEC.md).

Before changing models:

1. Understand existing relationships.

2. Consider data integrity.

3. Consider migration impact.

4. Avoid unnecessary duplication.

5. Add appropriate constraints.

Never make destructive database changes without explicitly explaining the impact.

---

## API Development

Follow the API structure defined in PROJECT_[SPEC.md](http://SPEC.md).

Use appropriate HTTP status codes.

Return consistent validation errors.

Protected endpoints must require authentication.

User-owned resources must enforce ownership at the backend level.

Never depend on the frontend to enforce authorization.

---

## Frontend Development

Follow the frontend architecture defined in PROJECT_[SPEC.md](http://SPEC.md).

Keep components focused.

Do not duplicate API configuration.

Use the centralized API client.

Handle:

- Loading states

- Success states

- Validation errors

- API errors

- Authentication failures

Keep sensitive information out of the frontend whenever possible.

---

## AI Development

AI functionality must remain modular.

Do not place direct LLM API calls throughout unrelated application code.

Use an AI service/provider abstraction.

AI providers and models should be configurable.

Core application functionality must not depend on AI unless explicitly specified.

AI functionality must respect user authorization and document ownership.

---

## Testing

Important functionality must have automated tests.

After significant changes:

1. Run relevant tests.

2. Check for failures.

3. Fix root causes.

4. Run the tests again.

Do not hide failures by disabling tests.

Prioritize tests for:

- Authentication

- Authorization

- User ownership

- CRUD operations

- Business logic

- File processing

- AI functionality

- Important error cases

---

## Error Handling

Handle errors explicitly.

Do not silently ignore exceptions.

Do not expose internal implementation details to users.

Production errors must not expose:

- Stack traces

- Database credentials

- API keys

- Internal secrets

Fix root causes rather than hiding errors.

---

## Dependencies

Before adding a dependency:

1. Determine whether it is actually necessary.

2. Check whether the existing stack already provides the required functionality.

3. Prefer established and maintained packages.

4. Avoid adding dependencies for trivial functionality.

---

## Documentation

Keep documentation synchronized with implementation.

If an architectural decision changes, update the relevant documentation.

Do not leave documentation describing functionality that does not exist.

---

## Git

Make changes that can be represented by meaningful commits.

Use conventional commit-style messages where appropriate.

Examples:

feat(auth): implement registration

feat(goals): add goal CRUD

fix(auth): handle token refresh failure

test(goals): add ownership tests

docs: update architecture

Do not rewrite Git history or delete existing commits unless explicitly instructed.

---

## Before Large Changes

For large architectural changes:

1. Explain the problem.

2. Explain the proposed solution.

3. Explain alternatives if relevant.

4. Explain the trade-offs.

5. Wait for approval before making the architectural change.

For normal implementation within the existing architecture, proceed without unnecessary confirmation.

---

## Verification

After implementing a task:

1. Run relevant tests.

2. Run the application when appropriate.

3. Verify the feature works.

4. Check for obvious regressions.

5. Review security implications.

6. Review code quality.

Do not claim that something works without actually verifying it.

---

## Completion Report

After completing a requested milestone or significant task, provide:

### Files Created

List every new file.

### Files Modified

List every modified file.

### Features Implemented

Summarize what was implemented.

### Tests Executed

List tests and commands executed.

### Test Results

Report whether they passed or failed.

### Known Issues

List remaining problems honestly.

### Next Recommended Step

State the next milestone or task according to PROJECT_[SPEC.md](http://SPEC.md).

---

## Important Rule

The developer is using AI to accelerate implementation.

Do not replace engineering discipline with AI-generated assumptions.

The repository, PROJECT_[SPEC.md](http://SPEC.md), tests, and actual runtime behavior are the sources of truth.

When uncertain, inspect the existing code and specification before making assumptions.