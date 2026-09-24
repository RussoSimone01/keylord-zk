# Keylord ZK

![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-unlicensed-lightgrey)

Password manager con architettura **Zero Knowledge**: il server non ha mai accesso
alle password degli utenti. Tutta la crittografia avviene nel browser tramite
WebCrypto API — il server gestisce solo blob cifrati opachi.

Progetto personale sviluppato per imparare React, mettendo in pratica un backend
.NET già consolidato con un frontend costruito da zero.

---

## Indice

- [Come funziona](#come-funziona)
- [Stack tecnologico](#stack-tecnologico)
- [Struttura del progetto](#struttura-del-progetto)
- [Setup](#setup)
    - [Prerequisiti](#prerequisiti)
    - [Database (Neon)](#database-neon)
    - [Backend](#backend)
    - [Frontend](#frontend)
- [Funzionalità](#funzionalità)
- [Sicurezza](#sicurezza)
- [Roadmap](#roadmap)

---

## Come funziona

La master password dell'utente non lascia mai il browser. Da essa vengono derivate
due chiavi indipendenti tramite PBKDF2 + HKDF:

```
masterPassword
    │
    ▼
PBKDF2 (600.000 iterazioni, SHA-256)
    │
    ├── HKDF(info="auth")     → authKey        → inviata al server per autenticarsi
    └── HKDF(info="encrypt")  → encryptionKey  → resta nel browser, cifra il vault
```

Il server riceve solo l'`authKey` (che tratta come una password qualunque, con bcrypt)
e blob cifrati con AES-GCM. Non ha mai modo di risalire al contenuto delle credenziali
salvate.

## Stack tecnologico

**Backend**

- ASP.NET Core Web API — .NET 10
- Entity Framework Core 9 + Npgsql (PostgreSQL)
- Autenticazione JWT (access token 15 min) + refresh token rotante (7 giorni)
- BCrypt.Net per l'hashing lato server
- AspNetCoreRateLimit per il rate limiting

**Frontend**

- React 19 + TypeScript + Vite
- WebCrypto API nativa per PBKDF2 / HKDF / AES-GCM
- Zustand per lo state management
- React Router per il routing
- Axios con interceptor per refresh automatico dei token
- Lucide React per le icone

**Database & Hosting**

- PostgreSQL su [Neon](https://neon.tech) (free tier)

## Struttura del progetto

```
keylord-zk/
├── backend/
│   ├── Controllers/         → AuthController, VaultController
│   ├── Data/                → AppDbContext + Migrations
│   ├── Models/               → User, Credential, RefreshToken
│   ├── DTOs/
│   ├── Repositories/         → Interfaces + Implementations
│   ├── Services/              → Interfaces + Implementations
│   ├── Middleware/            → ErrorHandlingMiddleware
│   └── backend.csproj
│
└── frontend/
    └── src/
        ├── crypto/            → vault.ts (PBKDF2, HKDF, AES-GCM)
        ├── api/                → client.ts, auth.ts, vault.ts
        ├── store/              → authStore.ts, themeStore.ts
        ├── pages/              → Login, Signup, Vault, Settings
        ├── components/         → Navbar, ProtectedRoute, PublicRoute, ...
        └── types/
```

## Setup

### Prerequisiti

- [.NET SDK 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- Un account [Neon](https://neon.tech) (gratuito) per il database PostgreSQL
- `dotnet-ef` come tool globale:
    ```bash
    dotnet tool install --global dotnet-ef
    ```

### Database (Neon)

1. Crea un account su [neon.tech](https://neon.tech)
2. Crea un nuovo progetto — ottieni una connection string del tipo:
    ```
    postgresql://user:password@xxx.neon.tech/neondb?sslmode=require
    ```
3. Convertila nel formato key-value richiesto da Npgsql (vedi sotto)

### Backend

```bash
cd backend
dotnet restore
```

Crea `appsettings.Development.json` a partire da `appsettings.json`, compilando i valori mancanti:

```json
{
	"ConnectionStrings": {
		"Default": "Host=xxx.neon.tech;Database=neondb;Username=...;Password=...;SSL Mode=Require"
	},
	"Jwt": {
		"Secret": "<stringa casuale di almeno 32 caratteri>",
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

> Genera un secret sicuro con:
>
> ```powershell
> [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
> ```

Applica le migration e avvia il server:

```bash
dotnet ef database update
dotnet run
```

Il backend sarà disponibile su `http://localhost:5056` (la porta può variare, controlla l'output del comando).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Verifica che `vite.config.ts` proxati `/api` verso la porta corretta del backend:

```ts
server: {
  proxy: {
    "/api": "http://localhost:5056",
  },
},
```

L'app sarà disponibile su `http://localhost:5173`.

## Funzionalità

- Registrazione e login con derivazione chiavi lato client
- CRUD completo delle credenziali, cifrate individualmente con AES-GCM
- Ricerca e filtro delle credenziali nel vault
- Copia rapida di username e password negli appunti
- Cambio password con ricifratura dell'intero vault
- Eliminazione account con conferma esplicita
- Refresh token con rotazione e rilevamento furto
- Lockout progressivo dopo tentativi di login falliti
- Tema chiaro/scuro
- Layout responsive

## Sicurezza

- **Zero Knowledge**: il server non deriva mai chiavi né vede password in chiaro
- **PBKDF2** a 600.000 iterazioni per la derivazione della master key
- **AES-GCM** con IV casuale per ogni cifratura
- **bcrypt** sull'`authKey` lato server come ulteriore livello di difesa
- **Rate limiting** su login, registrazione e recupero salt
- **Lockout progressivo**: 15 min → 1 ora → 24 ore → permanente, ogni 3 tentativi falliti
- **Rotazione refresh token** con revoca automatica di tutte le sessioni in caso di riuso di un token già revocato
- **Transazioni atomiche** sul cambio password (aggiornamento credenziali + token in un'unica operazione)

## Roadmap

- [ ] Test automatici (unit + integration)
- [ ] Generatore e tester di password
- [ ] Nuove tipologie di credenziali da salvare
- [ ] Recovery password tramite recovery code monouso
- [ ] Verifica se le credenziali sono state compromesse
- [ ] Organizzazione delle credenziali in cartelle
- [ ] Condivisione delle credenziali tramite gruppi
- [ ] Gestione scadenza credenziali con reminder via email

---

Progetto sviluppato a scopo di apprendimento personale.
