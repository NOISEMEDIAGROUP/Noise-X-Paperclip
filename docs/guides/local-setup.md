---
title: "Local Development Setup"
description: "Step-by-step guide for setting up Paperclip locally for development and testing"
---

# Local Development Setup

This guide walks you through setting up Paperclip on your local machine for development, testing, and personal use.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool    | Minimum Version | Check Command       |
| ------- | --------------- | ------------------- |
| Node.js | 20.0+           | `node --version`    |
| pnpm    | 9.15+           | `pnpm --version`    |
| Git     | 2.30+           | `git --version`     |

### Installing Prerequisites

<CodeGroup>

```bash macOS
# Install Node.js via Homebrew
brew install node@20

# Install pnpm
npm install -g pnpm@latest
```

```bash Ubuntu / Debian
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm@latest
```

```bash Windows
# Install Node.js via winget
winget install OpenJS.NodeJS.LTS

# Install pnpm
npm install -g pnpm@latest
```

</CodeGroup>

## Quick Start (Recommended)

The fastest way to get started is the one-command onboarding:

```bash
npx paperclipai onboard --yes
```

This handles cloning, installing, database setup, and starting the server.

## Manual Setup

### 1. Clone the Repository

```bash
git clone https://github.com/abhilashjaiswal0110/paperclip.git
cd paperclip
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment (Optional)

Paperclip works out of the box with embedded PostgreSQL (no external database installation needed). If you want to use an external PostgreSQL instance:

```bash
cp .env.example .env
```

Edit `.env` and set your database URL:

```env
DATABASE_URL=postgres://paperclip:paperclip@localhost:5432/paperclip
PORT=3100
```

<Note>
Leave `DATABASE_URL` unset to use the embedded PostgreSQL database. Data is stored under `~/.paperclip/instances/<instance>/db`.
</Note>

### 4. Start Development Server

```bash
pnpm dev
```

This starts:
- **API Server**: `http://localhost:3100`
- **UI Dashboard**: `http://localhost:3100` (served by the API server)

### 5. Verify Installation

```bash
# Check API health
curl http://localhost:3100/api/health

# List companies (should return an empty array initially)
curl http://localhost:3100/api/companies
```

Open `http://localhost:3100` in your browser to see the Paperclip dashboard.

## Development Modes

### Watch Mode (Default)

```bash
pnpm dev
```

Automatically rebuilds and restarts on file changes. Best for active development.

### One-Time Run

```bash
pnpm dev:once
```

Single build and run without watching for changes.

### Server Only

```bash
pnpm dev:server
```

Starts only the API server (useful when working on the UI separately).

### UI Only

```bash
pnpm dev:ui
```

Starts only the Vite dev server for the UI.

## Database Operations

### Reset Local Database

To start fresh with a clean database:

```bash
rm -rf ~/.paperclip/instances/*/db
pnpm dev
```

### Generate Migrations

After modifying the database schema:

```bash
pnpm db:generate
```

### Run Migrations

```bash
pnpm db:migrate
```

### Backup Database

```bash
pnpm db:backup
```

## Running Tests

### Unit Tests

```bash
# Interactive mode
pnpm test

# Single run
pnpm test:run
```

### End-to-End Tests

```bash
# Install Playwright browsers first
npx playwright install

# Run E2E tests
pnpm test:e2e

# Run with browser visible
pnpm test:e2e:headed
```

## Type Checking and Building

```bash
# Type check all packages
pnpm -r typecheck

# Build all packages
pnpm build
```

## Docker Setup

For running Paperclip in Docker:

```bash
docker compose up
```

Or use the quickstart compose file:

```bash
docker compose -f docker-compose.quickstart.yml up
```

See the [Docker deployment guide](/deploy/docker) for more details.

## Troubleshooting

### Port Already in Use

If port 3100 is already in use:

```bash
# Find the process
lsof -i :3100

# Set a different port
PORT=3200 pnpm dev
```

### Embedded PostgreSQL Issues

If you encounter database errors with embedded PostgreSQL:

```bash
# Remove the default embedded Postgres data directory
rm -rf ~/.paperclip/instances/*/db
pnpm dev
```

### Dependency Issues

```bash
# Clean install
rm -rf node_modules
pnpm install
```

### Build Errors

```bash
# Full clean rebuild
rm -rf node_modules dist
pnpm install
pnpm build
```
