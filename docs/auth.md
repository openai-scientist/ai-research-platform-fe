# Frontend authentication

Authentication follows [the backend handoff](api/handoff/frontend-api-handoff.md), [the October 5 update](api/handoff/frontend-api-handoff-2.md), and [the October 6 password reset contract](api/handoff/password-reset-handoff.md). The backend owns credentials and the HttpOnly `platform_session` cookie. The frontend does not create session cookies, decode JWTs, or store access/refresh tokens.

## Configuration

Set the backend origin in `.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

An URL ending in `/api/v1` is also accepted. If Next.js needs a different internal backend address, set the server-only `API_URL`. Restart the development server after changing environment variables.

- Add the actual frontend origin (normally `http://localhost:3000`) to the backend's `CORS_ALLOWED_ORIGINS`, with credentialed CORS enabled.
- Use the same hostname locally: `localhost:3000` and `localhost:8000`. Mixing `localhost` with `127.0.0.1` prevents the frontend server from receiving the backend cookie.
- Server-rendered route protection forwards `platform_session` to `/auth/me`. In production, serve the API on the same hostname (for example through a reverse proxy), or configure the backend session cookie's domain/path so it also reaches the frontend. A backend-only cookie on a separate domain cannot authenticate Next.js Server Components.
- Backend requests use credentials. Authenticated mutations obtain `X-CSRF-Token` automatically. Login, register, verify-email, resend-verification, forgot-password, verify-reset-password, and reset-password are public and exempt. Tokens remain in memory and are reacquired after a reload.

## User flows

- Login: `/auth/login`; registration: `/auth/register`; password recovery: `/auth/forgot-password`. These routes share the existing authentication shell and local UI components. Login/register redirect signed-in users to their workspace; password recovery remains accessible with or without an existing session.
- Registration returns email verification timing settings without establishing a session. The form switches to a 6-digit code step. `verify-email` sends `{ email, code, password }` and establishes the session. Email and password stay only in component memory during this step; reload returns to the initial form. Existing unverified users can resume from login.
- Login errors with `EMAIL_NOT_VERIFIED` open the same code step and call `resend-verification`. Codes are valid for the configured `expires_in_seconds`; resend buttons count down `resend_after_seconds`. `OTP_INVALID` stays on the code step, clears the code for retry, and reports the backend message through a toast.
- Password recovery has three separate steps: email, OTP, and new password. `forgot-password` requests a code; `verify-reset-password` sends `{ email, code }` and returns a one-use `reset_token`. Only then does the password form open, sending `{ email, reset_token, new_password }` to `reset-password`. The token and its expiry stay in component memory; reload, restarting, or changing email discards them. No token is placed in URLs or browser storage. Verification does not create or revoke a session. Responses do not reveal whether the account exists. Reset success clears reset and local session state, notifies other tabs, and returns to login without automatically signing in.
- Token expiry or `RESET_TOKEN_INVALID` returns to the OTP step to request a new code. Password validation and `PASSWORD_UNCHANGED` retain the token so the password can be corrected. Code verification and reset are not retried automatically after network failures; a lost verification response requires requesting a fresh code.
- New passwords are 8–128 characters. Login and current-password fields accept 1–128 characters to support temporary passwords assigned by admins. Password confirmation stays on the frontend.
- Users with `must_change_password` are directed to `/change-password` before accessing the workspace, including after reload. This page uses the existing password fields and `change-password` API, and offers sign-out. Notification streaming waits until the mandatory password change is completed.
- The account menu's **Account** item opens **Profile** and **Security** tabs. Profile updates the display name and profile picture; email is read-only. Security provides password change and **Log out of all devices**. Both header and sidebar menus use the same dialog, and profile changes refresh Redux, query caches, and other open tabs.
- Profile pictures accept PNG, JPEG, or WebP up to 4 MiB. Clicking the avatar opens the file picker; the frontend crops a centered square, resizes it to at most 512 pixels, and uploads immediately. A temporary preview and spinner appear during upload; failure restores the saved avatar. Avatar, email, and display name share one row. Users can remove their picture. API avatar paths are resolved against the API origin, retain `?v=`, and load with credentials. Updated pictures appear in account menus and admin user rows.
- Platform admins create accounts through **Users → Add User** with email, optional display name, and an option to send sign-in details. The backend provides the temporary password; the frontend never sends a password or role during creation. After success, the dialog shows credentials and the actual `invite_email_sent` status, including a successful creation without email delivery.
- **Users → Actions → Edit profile** lets an admin update another user's display name and picture. Accounts that still require a password change can receive sign-in details again, subject to cooldown and suspension rules. Granting admin access requires verified email and a completed password change. Removing admin access sends `role: "user"`.
- Logout calls the backend before clearing local session state. A failed logout keeps the session and shows an error toast.
- `/auth/me` restores the session when entering protected routes. Public pages do not bootstrap or recheck a session on focus. Successful login/email verification explicitly loads the current user; focus and cross-tab events recheck protected routes, including mandatory password change. Session-expiry responses clear user-specific query caches and return to login.
- Platform admins land on `/admin`; other users land on `/projects`. Safe protected return paths supplied by `?next=` are supported at login. Project roles are derived from each membership, never from a global JWT role.
- All frontend-authored copy and toasts are English. API error toasts use the backend message; validation errors also use toasts. `RATE_LIMITED` respects `Retry-After`.

Google sign-in remains unavailable. Project invitations and broader list-filter changes from the handoff are outside this change.

## Validation status

The authentication implementation has passed the frontend unit/service tests and production build. New admin-account and profile/avatar checks cover request payloads, multipart uploads, CSRF, avatar URL versions, file limits, square cropping, resizing, and bitmap cleanup. Browser interaction, authenticated live backend requests, actual email delivery, and deployment remain separate checks. See [the login test guide](auth-login-test.md) for existing credentials and commands.
