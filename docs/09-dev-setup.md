# Development Setup

## Prerequisites

- Node.js 18+
- npm 9+
- PHP 8.1+
- MySQL 8+

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

1. Copy environment variables for local development:

```bash
cd services/api
cp .env.example .env
```

2. Create the local database:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bible_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

3. Apply the schema manually:

```bash
mysql -u root -p bible_app < ../../infra/sql/schema.sql
```

4. Start the API service:

```bash
php -S 127.0.0.1:8080 -t public
```

5. Verify service and DB connectivity:

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/db/ping
```

Expected health response:

```json
{"ok":true,"data":{"service":"api"}}
```

Expected DB ping response when DB is configured:

```json
{"ok":true,"data":{"connected":true}}
```

If DB configuration is invalid or unavailable, `/db/ping` returns:

```json
{"ok":false,"error":{"code":"DB_CONNECT_FAILED","message":"Database connection failed.","details":null}}
```
