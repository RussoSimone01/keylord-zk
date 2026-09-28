# Keylord ZK

![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-EF_Core_10-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-unlicensed-lightgrey)

A **zero-knowledge** password manager. All cryptography runs in the browser through the native WebCrypto API: the server never sees a master password, never derives a key, and only ever stores opaque encrypted blobs.

---

## Table of contents

- [How it works](#how-it-works)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
	- [Prerequisites](#prerequisites)
	- [Backend](#backend)
	- [Frontend](#frontend)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Security model](#security-model)
- [Roadmap](#roadmap)

---

## How it works

The master password never leaves the browser. Two independent keys are derived from it using PBKDF2 followed by HKDF:

```
masterPassword + salt (32 random bytes, generated at signup)
	│
	▼
PBKDF2 (600,000 iterations, SHA-256)
	│
	├── HKDF(info="auth")    → authKey        → sent to the server to authenticate
	└── HKDF(info="encrypt") → encryptionKey  → stays in the browser, encrypts the vault
```

- **authKey** is exported as a 64-character hex string and sent to the server, which treats it like an ordinary password and stores only its bcrypt hash.
- **encryptionKey** is a non-extractable `CryptoKey` held in memory only. It is never persisted and never transmitted.

Each credential (site, username, password) is serialized to JSON and encrypted individually with AES-256-GCM using a fresh random 12-byte IV. The server stores the result as a single `ivBase64:ciphertextBase64` string and has no way to recover its contents.

At login, the client first fetches the user's salt and iteration count (`GET /api/auth/salt/{username}`), derives both keys locally, then authenticates with the `authKey`.

## Features

- Signup and login with client-side key derivation
- Full CRUD on credentials, each encrypted individually with AES-GCM
- Vault search by site or username
- One-click copy of usernames and passwords to the clipboard
- Password generator using `crypto.getRandomValues` with rejection sampling (8–64 characters, configurable character classes, look-alike characters such as `0/O` and `1/l/I` excluded)
- Password strength meter
- Master password change with full re-encryption of the vault, applied server-side in a single database transaction
- Account deletion with explicit confirmation
- Rotating refresh tokens with reuse detection
- Progressive account lockout after failed login attempts
- Five color themes (Terminal, Paper, Amber, Midnight, Daylight), defaulting to the OS light/dark preference

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
- Axios with an interceptor that refreshes expired access tokens transparently
- Lucide React icons, IBM Plex Sans and JetBrains Mono fonts

**Hosting**

- Frontend on GitHub Pages, deployed by a GitHub Actions workflow
- Backend as a Docker container on Render
- Any PostgreSQL instance (e.g. Neon)

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
│   ├── Middleware/           → ErrorHandlingMiddleware
│   ├── Migrations/           → EF Core migrations
│   ├── Models/               → User, Credential, RefreshToken
│   ├── Repositories/         → interfaces and implementations
│   ├── Services/             → AuthService, VaultService, TokenService
│   ├── dockerfile            → multi-stage build for the API
│   ├── render.yaml           → Render service definition
│   └── Program.cs
│
└── frontend/
	├── public/               → favicon, 404.html (SPA redirect for GitHub Pages)
	└── src/
		├── api/              → Axios client, auth and vault endpoints
		├── components/       → Navbar, route guards, generator, strength meter, ...
		├── crypto/           → vault.ts (key derivation, AES-GCM), password.ts (generator, strength)
		├── pages/            → Login, Signup, Vault, Generator, Settings
		├── store/            → authStore, themeStore
		├── styles/
		└── types/
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

Pending migrations are applied automatically at startup, so no separate `dotnet ef database update` step is required. The API listens on `http://localhost:5056` (see `Properties/launchSettings.json`). In the Development environment the OpenAPI document is exposed at `/openapi/v1.json`.

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

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run build`   | Type-check and build to `frontend/dist`  |
| `npm run preview` | Serve the production build locally       |
| `npm run lint`    | Run ESLint                               |

## API reference

All routes are prefixed with `/api`. Routes marked 🔒 require an `Authorization: Bearer <accessToken>` header.

| Method   | Route                       | Description                                                            |
| -------- | --------------------------- | ---------------------------------------------------------------------- |
| `POST`   | `/auth/register`            | Create an account from username, optional email, authKey and salt      |
| `POST`   | `/auth/login`               | Authenticate with username and authKey, returns access/refresh tokens  |
| `GET`    | `/auth/salt/{username}`     | Return the user's KDF salt and iteration count                         |
| `POST`   | `/auth/refresh`             | Exchange a refresh token for a new token pair (rotation)               |
| `PUT`    | `/auth/change-password` 🔒  | Replace the authKey, salt and the whole re-encrypted vault atomically  |
| `POST`   | `/auth/verify-password` 🔒  | Check an authKey against the current user                              |
| `DELETE` | `/auth/account` 🔒          | Delete the account and all its data                                    |
| `GET`    | `/vault` 🔒                 | List the user's encrypted credentials                                  |
| `POST`   | `/vault` 🔒                 | Store a new encrypted credential                                       |
| `PUT`    | `/vault/{id}` 🔒            | Replace an encrypted credential                                        |
| `DELETE` | `/vault/{id}` 🔒            | Delete a credential                                                    |

Ready-made requests are available in `backend/backend.http`.

## Deployment

### Frontend (GitHub Pages)

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the frontend and publishes `frontend/dist` to GitHub Pages. Configure the following repository secret:

| Secret         | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| `VITE_API_URL` | Public base URL of the API, including the `/api` prefix (e.g. `https://<host>/api`) |

`public/404.html` implements the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) redirect so that client-side routes survive a page reload.

### Backend (Render)

`backend/render.yaml` defines a Docker web service built from the multi-stage `dockerfile`. The container listens on the port provided by Render through `$PORT`. Set these environment variables from the Render dashboard:

| Variable                     | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `ConnectionStrings__Default` | PostgreSQL connection string                      |
| `Jwt__Secret`                | JWT signing secret                                |
| `Cors__AllowedOrigin`        | Frontend origin, e.g. `https://<user>.github.io`  |

`ASPNETCORE_ENVIRONMENT` is set to `Production`, in which error responses return a generic message instead of exception details.

## Security model

- **Zero knowledge**: the server never receives the master password or the encryption key and never sees plaintext credentials.
- **Key separation**: HKDF with distinct `info` labels ensures the `authKey` known to the server reveals nothing about the `encryptionKey`.
- **PBKDF2** with 600,000 iterations of SHA-256 and a 32-byte per-user salt. The server accepts between 100,000 and 1,000,000 iterations and stores the value per user.
- **AES-256-GCM** with a random IV for every encryption, providing both confidentiality and integrity.
- **bcrypt** on the `authKey` server-side as an additional layer of defense if the database leaks.
- **Refresh tokens** are random 32-byte values, stored only as SHA-256 hashes and rotated on every use. Presenting a token that was already revoked is treated as theft and revokes every session of that user.
- **Rate limiting** per IP on registration (5/min), login (10/min) and salt lookup (10/min).
- **Progressive lockout**: every third consecutive failed login locks the account, for 15 minutes, then 1 hour, then 24 hours, and finally permanently. A successful login resets the counter.
- **Session storage**: tokens live in `sessionStorage` and are cleared when the tab is closed; the encryption key is never written to any storage.

## Roadmap

- [ ] Automated tests (unit and integration)
- [ ] Additional credential types
- [ ] Account recovery through single-use recovery codes
- [ ] Breach checks for stored credentials
- [ ] Folders for organizing credentials
- [ ] Credential sharing through groups
- [ ] Credential expiry with email reminders
