# diybrand.app

Build your brand, yourself.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL with Drizzle ORM

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL connection string.

4. Run database migrations:

```bash
npm run db:push
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/          # Next.js App Router pages and layouts
├── components/   # Reusable React components
├── db/           # Drizzle schema and database connection
└── lib/          # Shared utilities and helpers
```

## Scripts

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start development server       |
| `npm run build`   | Build for production           |
| `npm run start`   | Start production server        |
| `npm run lint`    | Run ESLint                     |
| `npm run db:push` | Push schema changes to the DB  |
| `npm run db:generate` | Generate migration files   |
| `npm run db:migrate`  | Run migrations             |
| `npm run db:studio`   | Open Drizzle Studio        |
