# Database Migrations

This directory contains Prisma migration files for the GETIDFIX platform.

## Running Migrations

### Development

```bash
# Apply all pending migrations and regenerate Prisma Client
npx prisma migrate dev

# Apply a specific migration with a name
npx prisma migrate dev --name <migration_name>

# Reset the database (drops all data) and re-apply all migrations
npx prisma migrate reset
```

### Production

```bash
# Apply pending migrations without resetting (safe for production)
npx prisma migrate deploy
```

### Introspection (existing database)

```bash
# Pull the current database schema into schema.prisma
npx prisma db pull
```

## Seeding

After running migrations, seed the database with default data:

```bash
npx ts-node prisma/seed.ts
# or
npx prisma db seed
```

## Migration Structure

Each migration directory is named `<timestamp>_<description>` and contains:
- `migration.sql` — the raw SQL that was applied

## Initial Migration

The initial migration (`20240101000000_init`) creates all tables defined in `schema.prisma`:
- `users`
- `wallets`
- `services`
- `transactions`
- `wallet_ledger`
- `notifications`
- `audit_logs`
- `password_reset_tokens`

And all PostgreSQL enum types:
- `Role`
- `UserStatus`
- `ServiceCategory`
- `TransactionType`
- `TransactionStatus`
- `LedgerDirection`
- `AuditOutcome`
