# Frontend authentication

Authentication follows [the backend handoff](api/frontend-api-handoff.md). The backend owns credentials and the HttpOnly `platform_session` cookie. The frontend does not create session cookies, decode JWTs, or store access/refresh tokens.

## Configuration

Set the backend origin in `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

An URL ending in `/api/v1` is also accepted. If Next.js needs a different internal backend address, set the server-only `API_URL`. Restart the development server after changing environment variables.

- Add the actual frontend origin (normally `http://localhost:3000`) to the backend's `CORS_ALLOWED_ORIGINS`, with credentialed CORS enabled.
- Use the same hostname locally: `localhost:3000` and `localhost:8000`. Mixing `localhost` with `127.0.0.1` prevents the frontend server from receiving the backend cookie.
- Server-rendered route protection forwards `platform_session` to `/auth/me`. In production, serve the API on the same hostname (for example through a reverse proxy), or configure the backend session cookie's domain/path so it also reaches the frontend. A backend-only cookie on a separate domain cannot authenticate Next.js Server Components.
- Backend requests use credentials. Mutations obtain `X-CSRF-Token` automatically; login/register are exempt. Tokens remain in memory and are reacquired after a reload.

## User flows

- Login: `/auth/login`; registration: `/auth/register`. Both routes live in the `auth` directory and share its layout and auth forms. Future password-reset routes belong here once backend support is available.
- Registration establishes a session immediately, without a second login request.
- Passwords are 8–128 characters. Password confirmation stays on the frontend.
- The account menu's **Account** item opens password change and **Log out of all devices**. Both header and sidebar account menus use the same dialog.
- Logout calls the backend before clearing local session state. A failed logout keeps the session and shows an error toast.
- `/auth/me` restores the session when entering protected routes. Public pages, including login/register, do not bootstrap or recheck a session on focus. Successful login/register explicitly loads the current user; focus and cross-tab events recheck protected routes. Session-expiry responses clear user-specific query caches and return to login.
- Platform admins land on `/admin`; other users land on `/projects`. Safe protected return paths supplied by `?next=` are supported at login. Project roles are derived from each membership, never from a global JWT role.
- All frontend-authored copy and toasts are English. API error toasts use the backend message; validation errors also use toasts. `RATE_LIMITED` respects `Retry-After`.

Google sign-in, password reset, and email verification are not exposed because the backend does not provide them. The project/review/admin feature data remains the existing scaffold; implementing their APIs is separate from authentication.

## Validation status

Build, lint, type checking, browser screenshots, and live backend authentication have not been run. Repository instructions require an explicit request before validation commands.
