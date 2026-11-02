# Gaming Café Session & Dynamic Pricing System
DBMS Level 3 project: Jyeshta J (PES2UG24CS637) and Manapriya K (PES2UG24CS677), Section K


Next.js 14 + MySQL 8 (relational core) + MongoDB (activity log).

## Setup
1. In MySQL: `CREATE DATABASE <name>;` then run, in order: `sql/schema.sql`, `sql/routines.sql`, `sql/advanced.sql`, then your DML/insert script.
2. `cp .env.example .env.local` and fill it in (never commit it).
3. `npm install && npm run dev` and open http://localhost:3000/login
4. Start MongoDB locally (or use an Atlas URI in `MONGODB_URI`).

## Roles
- Admin: everything plus reports
- Staff: start/end sessions, take payments
- Customer: sees only their own sessions (stored procedure)

## Flow
Start session (PC locked, set In Use) → End session (price computed from category, time slot, day type, utilisation and membership; PC freed; invoice created, all in one transaction) → Record payment (trigger blocks overpayment and updates invoice status).

## Advanced DB features
Transactions, view, stored procedure, 3 triggers, indexes, full-text search, MongoDB logging.
