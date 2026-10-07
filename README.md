# Carevo Frontend

> **Your Skills. Your Opportunities.**

Carevo is an AI-powered career and job platform that connects job seekers, recruiters and admins. This repository is the React web client. It talks to the existing FastAPI + MongoDB backend over REST/JSON only, so the same API can later serve Android and iOS apps.

## Tech stack

- React 18 + Vite (JavaScript, no Next.js)
- Tailwind CSS 3 with CSS-variable design tokens (dark default, light theme architected)
- React Router 6
- Axios (single configured instance)
- Context API for global state (Auth, Theme, Toast); `src/store/` is reserved for Zustand if needed later
- React Hook Form for forms
- Lucide React for icons

## Getting started

Requirements: Node.js 18+ and npm.

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE_URL
npm run dev               # http://localhost:5173
```

### Commands

| Command           | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Production build into `dist/`        |
| `npm run preview` | Serve the production build locally   |

## Environment variables

| Variable            | Example                        | Notes                                   |
| ------------------- | ------------------------------ | --------------------------------------- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api`    | Includes the `/api` prefix. Required.   |

Only `VITE_` variables are exposed to the browser. Never put `JWT_SECRET`, the MongoDB URI or any other secret in them. The URL is read in one place (`src/config/env.js`) and consumed by `src/api/axios.js`; no component hardcodes it.

## Connecting the FastAPI backend

1. Start the backend (`http://127.0.0.1:8000`, Swagger at `/docs`).
2. Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` in `.env`.
3. Allow the dev origin with CORS in FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Contract assumptions (adjust in one place if your backend differs):

- `POST /auth/login` accepts JSON `{ "email", "password" }` and returns `{ "access_token", "token_type" }`. If it uses `OAuth2PasswordRequestForm` (form-encoded `username`/`password`), change only `login` in `src/api/auth.api.js`.
- `POST /auth/register` accepts `{ name, email, password }`. The role is never sent; the backend assigns `user`.
- `GET /auth/me` returns the current user. If that route is not deployed, the client falls back to `GET /users/me`.
- Roles are lowercase strings: `user`, `recruiter`, `admin`.
- List endpoints may return an array or an envelope (`items`/`results`/`data` + `total`). Mongo `_id` or `id` are both handled.
- Resume upload is multipart with the file in the `file` field.
- Job filters are sent as query params: `search`, `location`, `job_type`, `skills` (comma separated), `min_salary`, `company`, `page`, `limit`.
- Applying sends `{ resume_id, cover_letter }`. Adding a skill sends `{ skill_id, proficiency }`.

`src/utils/normalizers.js` is the only place that knows about alternative field names, so contract changes stay local.

## API endpoint status

| Module                      | Endpoints                                                                                   | Status  |
| --------------------------- | ------------------------------------------------------------------------------------------- | ------- |
| Auth                        | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                                   | Live    |
| User / profile              | `GET/PUT /users/me`, `GET/PUT /users/me/profile`                                            | Live    |
| Skills                      | `GET /skills`, `GET/POST /users/me/skills`, `DELETE /users/me/skills/{id}`                  | Live    |
| Resumes                     | `POST/GET /resumes/`, `GET/DELETE /resumes/{id}`, `PATCH /resumes/{id}/default`             | Live    |
| Jobs                        | `GET /jobs`, `GET /jobs/{id}`                                                               | Live    |
| Applications                | `POST /jobs/{id}/apply`, `GET /applications`, `GET /applications/{id}`                      | Live    |
| Saved jobs                  | `POST/DELETE /jobs/{id}/save`, `GET /users/me/saved-jobs`                                   | Planned |
| Interviews                  | `GET /interviews`, `GET /interviews/{id}`                                                   | Planned |
| Videos                      | `GET /videos/feed`, `GET /videos/{id}`; like, comment, save sub-routes                      | Planned |
| Messages                    | `GET /messages`, `GET /messages/{user_id}`, `POST /messages`                                | Planned |
| Notifications               | `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`     | Planned |
| Reports                     | `POST /reports`                                                                             | Planned |
| Social auth / refresh       | `POST /auth/google`, `/auth/apple`, `/auth/refresh`, `/auth/logout`                         | Planned |
| Recruiter / Admin           | Not defined yet                                                                             | Planned |

"Planned" modules are already wired in `src/api/`. When the backend answers 404/405/501, pages show a clean "coming soon" state instead of an error. Nothing is mocked.

## Folder structure

```
src/
├── api/            One module per backend area + axios.js (shared instance) + errors.js
├── assets/
├── components/
│   ├── ui/         Design-system primitives (Button, Input, Modal, Toast, ...)
│   ├── common/     App-level pieces (DashboardShell, DataState, ReportModal, ...)
│   ├── auth/ profile/ resume/ jobs/ applications/ videos/ messages/ notifications/
├── config/env.js   Environment access
├── context/        AuthContext, ThemeContext, ToastContext
├── hooks/          useApi, useAuth, useProfile, useSavedJobs, useNotifications, ...
├── layouts/        Public / User / Recruiter / Admin layouts
├── pages/          public, auth, user, recruiter, admin
├── routes/         AppRoutes, ProtectedRoute, RoleRoute, PublicRoute
├── store/          Reserved for Zustand
└── utils/          constants, helpers, validators, normalizers, tokenStorage
```

Data flow: `Component -> hook (useApi) -> api module -> Axios instance -> FastAPI -> MongoDB`.

## Authentication flow

1. **Register** sends name, email and password. There is no role field. On success the user is sent to Login.
2. **Login** posts credentials, stores the access token, then calls `GET /auth/me` and redirects by backend role: `user -> /dashboard`, `recruiter -> /recruiter/dashboard`, `admin -> /admin/dashboard`.
3. **Session restore**: on load, a stored token is validated with `/auth/me`.
4. **Remember me** keeps the token in `localStorage`; otherwise it lives in `sessionStorage`. Only the token is stored, never application data.
5. **Axios** attaches `Authorization: Bearer <token>`. A `401` on a protected call clears the token and signs the user out.
6. **Logout** clears the token and user state.

Google and Apple sign-in are shown as "Coming soon" and are not faked. When the backend ships them, call `loginWithProvider(provider, credential)` from `AuthContext`; it reuses the same token handling.

## Role-based routing

| Role      | Routes                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Public    | `/`, `/about`, `/login`, `/register`                                                                                                    |
| User      | `/dashboard`, `/jobs`, `/jobs/:id`, `/saved-jobs`, `/applications`, `/applications/:id`, `/interviews`, `/profile`, `/profile/edit`, `/resume`, `/skills`, `/videos`, `/messages`, `/notifications` |
| Recruiter | `/recruiter/dashboard`, `/company`, `/jobs`, `/jobs/create`, `/jobs/:id/edit`, `/applications`, `/interviews`                           |
| Admin     | `/admin/dashboard`, `/users`, `/recruiters`, `/jobs`, `/reports`, `/settings`                                                           |

Guests hitting a protected route go to `/login`; a signed-in user on a route for another role goes to `/unauthorized`. These guards are UX only. **The backend remains the authority** and must enforce permissions on every endpoint.

## Error handling

`src/api/errors.js` normalises every failure into an `ApiError` with a friendly message: network errors, 400, 401, 403, 404, 409, 422 (FastAPI validation details become per-field errors) and 5xx (internal details are never shown).

## Production notes

- Build with `npm run build` and serve `dist/` from any static host.
- Configure the host to fall back to `index.html` for unknown paths (SPA routing).
- Set `VITE_API_BASE_URL` to the production API at build time, and restrict backend CORS to your real origin.
- Consider moving to short-lived access tokens with an httpOnly refresh cookie once `POST /auth/refresh` exists (see `src/utils/tokenStorage.js`).
- Light theme: token values already exist under `[data-theme="light"]` in `src/index.css`; the toggle is in the app header.
