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

The functional tests create a real Nest application and call `UsersController` methods directly. They use the real service, repository, Prisma service, and test MySQL database.

The test database is cleaned once during suite setup; it is not cleaned after tests. Because these tests use one real shared test database, run `npm test` and `npm run test:cov` separately instead of in parallel.
