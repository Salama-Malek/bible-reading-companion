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
php -S localhost:8000 -t public
```

Health check endpoint:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"ok":true}
```
