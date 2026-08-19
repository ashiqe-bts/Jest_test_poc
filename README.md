# NestJS Prisma MySQL CRUD POC

Minimal NestJS backend with Prisma, MySQL, a repository layer, and functional controller tests.

## Setup

Install dependencies:

```bash
npm install
```

Start MySQL with Docker:

```bash
npm run db:up
```

The compose file expects port `3306` to be free. It creates both databases through `docker/mysql/init/01-create-test-db.sql`:

- `nest_prisma_dev`
- `nest_prisma_test`

## Database

Apply the Prisma migration to the dev database:

```bash
npm run prisma:migrate:dev
```

Apply the same migration to the test database:

```bash
npm run prisma:migrate:test
```

Prisma CLI commands read the connection URL from `prisma.config.ts`. The app reads `DATABASE_URL` from `.env`; tests load the same `.env` file and switch `DATABASE_URL` to `TEST_DATABASE_URL` in `test/jest.setup.ts` before the Nest app or Prisma client is initialized.

The schema includes `User`, `Project`, and the `UserProject` join table. The project relation is used to demonstrate the prerequisite data commonly needed by integration tests; it does not add Project HTTP endpoints to this POC.

## Seed data

Seed the normal database configured by `DATABASE_URL` with the base user:

```bash
npm run prisma:seed
```

Seed the test database configured by `TEST_DATABASE_URL` with a deterministic user, project, and `UserProject` membership:

```bash
npm run prisma:seed:test
```

Both seeds use fixed UUIDs and Prisma `upsert`, so they are safe to run repeatedly. The Jest suite resets the three tables and applies the test fixture automatically; running the test seed manually is useful for inspecting or preparing the test database outside Jest.

## Run

```bash
npm run start:dev
```

Routes:

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

## Test

```bash
npm test
```

The integration tests create a real Nest application, listen on an ephemeral local port, and use Node's built-in `fetch` for HTTP requests. Requests pass through routing, validation, exception handling, the real service and repository, Prisma, and the test MySQL database.

The test database is cleaned and fixture-seeded once during suite setup; it is not cleaned after tests. Because these tests use one real shared test database, run `npm test` and `npm run test:cov` separately instead of in parallel.
