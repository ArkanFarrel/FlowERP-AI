# AI ERP Lite

## Project Overview

AI ERP Lite adalah aplikasi SaaS ERP untuk UMKM.

Tech Stack:
- Next.js 15
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Prisma ORM
- PostgreSQL
- Better Auth
- TanStack Query
- Zustand

---

## Project Goals

Tujuan project:

- Clean Architecture
- Reusable Components
- Type Safety
- Responsive UI
- Production Ready

---

## Coding Standards

Gunakan:

- TypeScript Strict Mode
- Functional Component
- Server Component secara default
- Client Component hanya jika diperlukan
- Hindari penggunaan any
- Gunakan async/await
- Gunakan Prisma untuk semua query database

---

## Folder Structure

app/
components/
features/
lib/
hooks/
types/
utils/
prisma/

---

## UI Rules

Gunakan:

- shadcn/ui
- Tailwind CSS
- Lucide React

Jangan membuat CSS manual kecuali benar-benar diperlukan.

---

## Naming Convention

Component:
PascalCase

File:
kebab-case

Function:
camelCase

Type:
PascalCase

Constant:
UPPER_CASE

---

## Database

ORM:
Prisma

Database:
PostgreSQL

Migration:

npx prisma migrate dev

Generate Client:

npx prisma generate

---

## Authentication

Better Auth

Semua route dashboard harus menggunakan authentication.

---

## API

Gunakan:

Server Actions terlebih dahulu.

Jika perlu endpoint public gunakan Route Handler.

---

## Validation

Gunakan:

- Zod
- React Hook Form

---

## State Management

Global State:

Zustand

Server State:

TanStack Query

---

## Before Finishing

Selalu:

- Build project
- Jalankan lint
- Perbaiki semua TypeScript Error
- Jangan meninggalkan TODO

Perintah:

npm run lint

npm run build