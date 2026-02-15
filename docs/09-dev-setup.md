# Development Setup

## Prerequisites

- Node.js 18+
- npm 9+
- PHP 8.1+

## Mobile App (`apps/mobile`)

```bash
cd apps/mobile
npm install
npx expo start
```

This starts the Expo Router mobile app (Home + History tabs).

## Admin Web (`apps/admin-web`)

```bash
cd apps/admin-web
npm install
npm run dev
```

This starts the Vite development server for the admin placeholder page.

## API Service (`services/api`)

```bash
cd services/api
php -S 127.0.0.1:8080 -t public
```

Health check endpoint:

```bash
curl http://127.0.0.1:8080/health
```

This service uses plain PHP (no framework).

Expected response:

```json
{"ok":true,"data":{"service":"api"}}
```
