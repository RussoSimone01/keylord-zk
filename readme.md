# Keylord ZK

![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-EF_Core_10-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-all_rights_reserved-lightgrey)

A **zero-knowledge** password manager. All cryptography runs in the browser through the native WebCrypto API: the server never sees a master password, never derives a key, and only ever stores opaque encrypted blobs.

---

## Table of contents

- [How it works](#how-it-works)
    - [Why a separate vault key](#why-a-separate-vault-key)
    - [Locking and sessions](#locking-and-sessions)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Backend](#backend)
    - [Frontend](#frontend)
- [API reference](#api-reference)
    - [Error responses](#error-responses)
- [Deployment](#deployment)
- [Security model](#security-model)
- [Roadmap](#roadmap)
- [License](#license)

---

## How it works

The master password never leaves the browser. Two independent keys are derived from it using PBKDF2 followed by HKDF, and a third, random key encrypts the credentials:

```
masterPassword + salt (32 random bytes, generated at signup)
	│
	▼
PBKDF2 (600,000 iterations, SHA-256)
	│
	├── HKDF(info="auth") → authKey      → sent to the server to authenticate
	└── HKDF(info="wrap") → wrappingKey  → stays in the browser, encrypts the vaultKey

vaultKey (random AES-256 key, generated in the browser at signup)
	└── encrypts the credentials (AES-GCM)
```

- **authKey** is exported as a 64-character hex string and sent to the server, which treats it like an ordinary password and stores only its bcrypt hash.
- **wrappingKey** is a non-extractable `CryptoKey` derived on demand. It is never persisted and never transmitted; its only job is to encrypt and decrypt the vault key.
- **vaultKey** is a random key generated at signup. The server stores only its wrapped form, encrypted with the `wrappingKey`, as an `ivBase64:ciphertextBase64` string (`WrappedVaultKey`). After login the client unwraps it into a non-extractable `CryptoKey` held in memory only.

Each credential (site, username, password) is serialized to JSON and encrypted individually with AES-256-GCM, using the `vaultKey` and a fresh random 12-byte IV. The server stores the result as a single `ivBase64:ciphertextBase64` string and has no way to recover its contents.

At login, the client first fetches the user's salt and iteration count (`GET /api/auth/salt/{username}`), derives the keys locally, then authenticates with the `authKey`. The login response carries the wrapped vault key, which the client unwraps with the `wrappingKey`. Iteration counts outside the accepted range are refused by the client, and unknown usernames receive a deterministic fake salt, so the lookup reveals nothing about which accounts exist.

### Why a separate vault key

If the password encrypted the data directly, changing it would force re-encrypting the whole vault. With a random intermediate key (the scheme also used by Bitwarden and 1Password):

- **Changing the password is cheap**: only the `vaultKey` is re-wrapped with the new `wrappingKey`; the credentials are not touched.
- **The key can be rotated**: when changing the password the user can also generate a new `vaultKey` and re-encrypt the whole vault, which is useful if a compromise is suspected.
- **More ways to unlock the vault can be added later** (recovery code, passkey, sharing) by encrypting another copy of the same `vaultKey`.

Each user also has a `VaultKeyEpoch` counter, incremented at every rotation. Together with the salt it identifies the current generation of the keys.

### Locking and sessions

The app distinguishes between **locking** the vault and **logging out**:

- **Lock** drops only the `vaultKey` from memory. The session stays open, so unlocking needs just the master password: the client derives the `wrappingKey` again and unwraps the vault key locally, without a server round trip. After three wrong passwords the session is ended and a full login is required, where the server-side lockout applies.
- **Log out** also revokes the refresh token on the server and clears every key and token from memory.

The vault locks itself after a period of inactivity (5 minutes by default, configurable from 1 to 60 minutes) and when the tab stays hidden for too long (1 minute by default, configurable from immediately to 30 minutes, or disabled in favour of the inactivity limit alone). The timings are stored on the device and clamped to their ranges, so editing them in storage cannot switch the lock off.

Locking manually, from the user menu or with **Alt+Shift+L** (**⌥⇧L** on macOS), locks every open tab of the app at once. Values copied to the clipboard are erased after 30 seconds by default (configurable from 10 seconds to 2 minutes, clamped the same way), and immediately when the vault is locked or the user logs out.

Reloading the page or duplicating the tab always requires the master password again: keys and tokens live in memory only, and each tab has its own session.

## Features

**Vault**

- Signup and login with client-side key derivation
- Full CRUD on credentials, each encrypted individually with AES-GCM, edited in a side panel that warns before discarding unsaved changes
- Vault search by site or username
- One-click copy of usernames and passwords, with automatic clipboard clearing after a configurable delay (30 seconds by default)
- Passwords masked with a fixed-length placeholder that does not reveal their length
- Password generator using `crypto.getRandomValues` with rejection sampling (8–64 characters, configurable character classes, look-alike characters such as `0/O` and `1/l/I` excluded)
- Password strength meter
- Credentials that cannot be decrypted are listed separately and can be deleted, without blocking the rest of the vault

**Account and security**

- Master password change that only re-wraps the vault key, so the credentials are not re-encrypted
- Optional vault key rotation during a password change: a new vault key is generated and the whole vault is re-encrypted with it, applied server-side in a single database transaction and rejected if the vault was modified meanwhile
- Lock and unlock with the master password alone, automatic lock after inactivity or when the tab is hidden, and a keyboard shortcut that locks every tab
- Account deletion with explicit confirmation and master password re-entry, verified by the server
- Rotating refresh tokens with reuse detection, expired tokens purged every 6 hours
- Progressive account lockout after failed password checks
- Error responses in RFC 9457 format with stable machine-readable codes, translated in the interface

**Interface**

- English and Italian, detected from the browser and switchable at any time, including before login
- Four color palettes (Terminal, Midnight, Amber, Violet), each with a light and a dark variant, following the operating system setting by default
- Responsive layout with keyboard-accessible menus and dialogs

## Tech stack

**Backend**

- ASP.NET Core Web API on .NET 10
- Entity Framework Core 10 with Npgsql (PostgreSQL)
- JWT access tokens (15 minutes) and rotating refresh tokens (7 days)
- BCrypt.Net-Next for server-side hashing of the `authKey`
- AspNetCoreRateLimit for per-IP rate limiting

**Frontend**

- React 19, TypeScript and Vite
- Native WebCrypto API for PBKDF2, HKDF and AES-GCM (no third-party crypto dependencies)
- Zustand for state management
- React Router
- i18next and react-i18next for translations
- Axios with an interceptor that refreshes expired access tokens transparently
- Lucide React icons, IBM Plex Sans and JetBrains Mono fonts
- ESLint and Prettier

**Hosting**

- Frontend on GitHub Pages, deployed by a GitHub Actions workflow
- Backend as a Docker container on Render
- Any PostgreSQL instance (e.g. Neon)

Code style is shared through `.editorconfig` at the repository root.

## Project structure

```
keylord-zk/
├── .github/workflows/
│   └── deploy.yml            → builds the frontend and publishes it to GitHub Pages
│
├── backend/
│   ├── Controllers/          → AuthController, VaultController
│   ├── Data/                 → AppDbContext
│   ├── DTOs/                 → request and response contracts
│   ├── Errors/               → ApiError, ApiException, AppErrors (error catalog)
│   ├── Extensions/           → claims helpers and custom claim types
│   ├── Middleware/           → GlobalExceptionHandler (ProblemDetails responses)
│   ├── Migrations/           → EF Core migrations
│   ├── Models/               → entities (User, Credential, RefreshToken) and domain records
│   ├── Repositories/         → interfaces and implementations
│   ├── Services/             → AuthService, VaultService, TokenService, background token cleanup
│   ├── Settings/             → typed configuration (Jwt, Cors), validated at startup
│   ├── Validation/           → limits and rules shared by DTOs and services
│   ├── backend.http          → ready-made requests for manual testing
│   ├── dockerfile            → multi-stage build for the API
│   └── Program.cs
│
├── frontend/
│   ├── public/               → favicon, 404.html (SPA redirect for GitHub Pages)
│   └── src/
│       ├── api/              → Axios client with token refresh, auth and vault endpoints, error messages
│       ├── components/       → navbar and user menu, unlock screen, credential panel, settings, ...
│       ├── crypto/           → vault.ts (key derivation, vault key, AES-GCM), password.ts (generator, strength)
│       ├── hooks/            → auto-lock, media queries
│       ├── i18n/             → i18next setup and the English and Italian translations
│       ├── lib/              → session handling, cross-tab lock, lock and clipboard settings, clipboard clearing
│       ├── pages/            → Login, Signup, Vault, Generator, Settings
│       ├── store/            → authStore (in-memory session), theme, locale and toast stores
│       ├── styles/
│       └── types/
│
├── .editorconfig
└── render.yaml               → Render Blueprint for the API (must stay in the repository root)
```

## Getting started

### Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) 20 or later (CI uses Node 24)
- A PostgreSQL database
- Optionally, the EF Core CLI for managing migrations manually:

    ```bash
    dotnet tool install --global dotnet-ef
    ```

### Backend

```bash
cd backend
dotnet restore
```

Create `appsettings.Development.json` next to `appsettings.json` and fill in the missing values:

```json
{
    "ConnectionStrings": {
        "Default": "<PostgreSQL connection string>"
    },
    "Jwt": {
        "Secret": "<random string of at least 32 characters>",
        "Issuer": "keylord-zk",
        "Audience": "keylord-zk-client",
        "AccessTokenExpiryMinutes": 15,
        "RefreshTokenExpiryDays": 7
    },
    "Cors": {
        "AllowedOrigin": "http://localhost:5173"
    }
}
```

A suitable secret can be generated with:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

or, on Linux/macOS:

```bash
openssl rand -base64 32
```

Start the API:

```bash
dotnet run
```

The `Jwt` and `Cors` sections and the connection string are validated at startup: a missing or invalid value stops the API with an explicit error before any database access. Pending migrations are then applied automatically, so no separate `dotnet ef database update` step is required. The API listens on `http://localhost:5056` (see `Properties/launchSettings.json`). In the Development environment the OpenAPI document is exposed at `/openapi/v1.json`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend. If your backend runs on a different port, update `vite.config.ts`:

```ts
server: {
  proxy: {
    "/api": "http://localhost:5056",
  },
},
```

The app is served under the `/keylord-zk/` base path, so open `http://localhost:5173/keylord-zk/`.

Other scripts:

| Command                | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run build`        | Type-check and build to `frontend/dist`      |
| `npm run preview`      | Serve the production build locally           |
| `npm run lint`         | Run ESLint                                   |
| `npm run format`       | Format the code with Prettier                |
| `npm run format:check` | Check that the code is formatted as expected |

## API reference

All routes are prefixed with `/api`. Routes marked 🔒 require an `Authorization: Bearer <accessToken>` header.

| Method   | Route                      | Description                                                                                                                                                                            |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/auth/register`           | Create an account from username, optional email, authKey, salt and wrapped vault key                                                                                                   |
| `POST`   | `/auth/login`              | Authenticate with username and authKey, returns access/refresh tokens, the wrapped vault key and its epoch                                                                             |
| `GET`    | `/auth/salt/{username}`    | Return the user's KDF salt and iteration count                                                                                                                                         |
| `POST`   | `/auth/refresh`            | Exchange a refresh token for a new token pair (rotation)                                                                                                                               |
| `POST`   | `/auth/logout`             | Delete the given refresh token, ending that session                                                                                                                                    |
| `PUT`    | `/auth/change-password` 🔒 | Replace authKey, salt and wrapped vault key; with `rotateVaultKey` also re-encrypt every credential in place (same ids) and bump the epoch. Atomic; 409 if the vault changed meanwhile |
| `POST`   | `/auth/verify-password` 🔒 | Check an authKey against the current user (counts towards the lockout)                                                                                                                 |
| `DELETE` | `/auth/account` 🔒         | Delete the account and all its data; requires the authKey in the body                                                                                                                  |
| `GET`    | `/vault` 🔒                | List the user's encrypted credentials                                                                                                                                                  |
| `POST`   | `/vault` 🔒                | Store a new encrypted credential                                                                                                                                                       |
| `PUT`    | `/vault/{id}` 🔒           | Replace an encrypted credential                                                                                                                                                        |
| `DELETE` | `/vault/{id}` 🔒           | Delete a credential                                                                                                                                                                    |

Usernames and emails are unique regardless of letter case, and lookups ignore case as well. New usernames may contain only letters, digits, dots, hyphens and underscores (at most 50 characters). Each credential's encrypted payload must have the `ivBase64:ciphertextBase64` format and at most 8,192 characters, a vault holds at most 2,000 credentials, and request bodies are limited to 64 KB (24 MB for `change-password`).

Outside the `/api` prefix, `GET /health` is the health check used by Render.

Ready-made requests are available in `backend/backend.http`.

### Error responses

Every error is returned as an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `application/problem+json` body with a stable machine-readable `code` (the catalog lives in `backend/Errors/AppErrors.cs`) and a human-readable `detail`:

```json
{
    "type": "https://tools.ietf.org/html/rfc9110#section-15.5.2",
    "title": "Unauthorized",
    "status": 401,
    "detail": "Invalid username or password",
    "instance": "POST /api/auth/login",
    "code": "auth.invalid_credentials",
    "traceId": "00-…"
}
```

The frontend translates errors by their `code` (`errors.codes.*` in the translation files) and falls back to the server's `detail` for codes it does not know.

## Deployment

### Frontend (GitHub Pages)

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the frontend and publishes `frontend/dist` to GitHub Pages. Configure the following repository secret:

| Secret         | Value                                                                               |
| -------------- | ----------------------------------------------------------------------------------- |
| `VITE_API_URL` | Public base URL of the API, including the `/api` prefix (e.g. `https://<host>/api`) |

`public/404.html` implements the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) redirect so that client-side routes survive a page reload.

### Backend (Render)

`render.yaml` in the repository root defines a Docker web service built from `backend/dockerfile`; only changes under `backend/` trigger a redeploy, and Render probes `GET /health`. The container runs as an unprivileged user and listens on the port in `$PORT` (set by Render, 8080 when absent). Set these environment variables from the Render dashboard:

| Variable                     | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `ConnectionStrings__Default` | PostgreSQL connection string                     |
| `Jwt__Secret`                | JWT signing secret                               |
| `Cors__AllowedOrigin`        | Frontend origin, e.g. `https://<user>.github.io` |

If the service was created manually rather than from the Blueprint, set Root Directory to `backend`, Dockerfile Path to `./dockerfile` and Health Check Path to `/health` in the service settings, and add `ReverseProxy__Enabled=true` to the environment variables.

`ASPNETCORE_ENVIRONMENT` is set to `Production`, in which unexpected errors return a generic message instead of exception details.

#### Client IP behind the proxy

Rate limiting and lockout logs rely on the client IP. With `ReverseProxy__Enabled=true` the API trusts the proxy headers, reading the client address from the `ReverseProxy:ClientIpHeader` header (default `X-Forwarded-For`) and taking the entry at position `ReverseProxy:ForwardLimit` counted from the right (default 1). Entries further left can be forged by the client. If the platform appends more than one address, increase `ForwardLimit` accordingly.

## Security model

- **Zero knowledge**: the server never receives the master password or the vault key in the clear and never sees plaintext credentials.
- **Key separation**: HKDF with distinct `info` labels ensures the `authKey` known to the server reveals nothing about the `wrappingKey`.
- **PBKDF2** with 600,000 iterations of SHA-256 and a 32-byte per-user salt. The iteration count is stored per user and can be raised at the next password change; both server and client accept only values between 600,000 and 2,000,000, so a compromised server cannot weaken the derivation by advertising fewer iterations.
- **AES-256-GCM** with a random IV for every encryption, providing both confidentiality and integrity.
- **Random vault key**: the password never encrypts the data directly. The server stores the vault key only in wrapped form, so it cannot be opened without the master password.
- **Key rotation**: protects the data written from that moment on and invalidates whoever knew the previous key, but it cannot make a copy of the database that was already stolen secret again.
- **Metadata**: zero knowledge hides the contents, not the metadata. The server can see how many credentials a user has, their size and when they change.
- **bcrypt** on the `authKey` server-side as an additional layer of defense if the database leaks.
- **Refresh tokens** are random 32-byte values, stored only as SHA-256 hashes and rotated on every use. Presenting a token that was already revoked, including two concurrent refreshes with the same token, is treated as theft and revokes every session of that user.
- **Session invalidation**: access tokens carry a fingerprint of the KDF salt and the vault key epoch, checked on every request. A password change, a vault key rotation or an account deletion invalidates every other session immediately, without waiting for token expiry.
- **Rate limiting** per IP on registration (5/min), login (10/min) and salt lookup (10/min).
- **No username enumeration** through login or salt lookup: unknown usernames get a deterministic fake salt (HMAC of the username with a key derived from the JWT secret) and the same error as a wrong password. Registration still reports a taken username, as it must.
- **Progressive lockout**: every third consecutive failed password check (login, password verification, password change, account deletion) locks the account, for 15 minutes, then 1 hour, then 24 hours for each further lock. Attempts are counted atomically before verification, so concurrent guesses cannot exceed the limit. A successful check resets the counter. When the lock is triggered by a check made from an authenticated session, every session of the user is ended; locks caused by failed logins leave existing sessions alone, so guessing passwords cannot log the user out.
- **Session storage**: tokens and the vault key live in memory only and are never written to any storage; only the username is kept in `sessionStorage` to prefill the login form. Reloading the page or duplicating the tab therefore requires the master password again, and each tab has its own session.
- **Local unlock**: a locked vault is reopened by unwrapping the vault key in the browser. Three failed attempts end the session, so further guesses must go through the server and its lockout.
- **Automatic lock and clipboard clearing**: the vault locks after inactivity or when the tab is hidden, and copied secrets are erased from the clipboard after a delay of at most 2 minutes (30 seconds by default) or as soon as the vault is locked.
- **Vault writes bound to the key**: credentials are created and updated only if the session's key is still current, checked under a lock shared with the password change and the key rotation, so data encrypted with an old key can never be stored.

## Roadmap

- [ ] Automated tests (unit and integration)
- [ ] Additional credential types
- [ ] Account recovery through single-use recovery codes
- [ ] Breach checks for stored credentials
- [ ] Folders for organizing credentials
- [ ] Credential sharing through groups
- [ ] Credential expiry with email reminders

## License

No license file is included: all rights are reserved by the author.
