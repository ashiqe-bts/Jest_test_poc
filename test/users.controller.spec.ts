import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { isUUID } from 'class-validator';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  seedTestFixture,
  TEST_FIXTURE,
} from '../prisma/seed-test';

jest.setTimeout(30_000);

interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface HttpResponse<TBody> {
  statusCode: number;
  body: TBody;
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type RequestBody = string | object;

const testUsers = {
  create: {
    name: 'Create Test',
    email: 'create.test@example.com',
  },
  duplicate: {
    name: 'Duplicate Test',
    email: 'duplicate.test@example.com',
  },
  listJohn: {
    name: 'List John Test',
    email: 'list.john.test@example.com',
  },
  listJane: {
    name: 'List Jane Test',
    email: 'list.jane.test@example.com',
  },
  orderJane: {
    name: 'Order Jane Test',
    email: 'order.jane.test@example.com',
  },
  orderJohn: {
    name: 'Order John Test',
    email: 'order.john.test@example.com',
  },
  orderAda: {
    name: 'Order Ada Test',
    email: 'order.ada.test@example.com',
  },
  findOne: {
    name: 'Find One Test',
    email: 'find.one.test@example.com',
  },
  updateName: {
    name: 'Update Name Test',
    email: 'update.name.test@example.com',
  },
  updateEmail: {
    name: 'Update Email Test',
    email: 'update.email.test@example.com',
  },
  updateSameEmail: {
    name: 'Update Same Email Test',
    email: 'update.same.email.test@example.com',
  },
  updateEmpty: {
    name: 'Update Empty Test',
    email: 'update.empty.test@example.com',
  },
  updateConflictSource: {
    name: 'Update Conflict Source Test',
    email: 'update.conflict.source.test@example.com',
  },
  updateConflictTarget: {
    name: 'Update Conflict Target Test',
    email: 'update.conflict.target.test@example.com',
  },
  delete: {
    name: 'Delete Test',
    email: 'delete.test@example.com',
  },
  deleteTwice: {
    name: 'Delete Twice Test',
    email: 'delete.twice.test@example.com',
  },
  inspect: {
    name: 'Inspect After Tests',
    email: 'inspect.after.tests@example.com',
  },
};

const missingUserId = 'a7648a47-93dd-4d4b-a4a1-26ab6bc2bd13';
const invalidUserIds = ['abc', '1.5', '0', '-1', 'not-a-uuid'];

describe('Users HTTP integration scenarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  async function http<TBody>(
    method: HttpMethod,
    path: string,
    expectedStatus: number,
    body?: RequestBody,
  ): Promise<HttpResponse<TBody>> {
    const testRequest = request(app.getHttpServer());
    const response = await (() => {
      switch (method) {
        case 'GET':
          return testRequest.get(path);
        case 'POST':
          return testRequest.post(path).send(body);
        case 'PATCH':
          return testRequest.patch(path).send(body);
        case 'DELETE':
          return testRequest.delete(path);
      }
    })();

    expect(response.status).toBe(expectedStatus);

    return {
      statusCode: response.status,
      body: response.body as TBody,
    };
  }

  function get<TBody>(path: string, expectedStatus: number) {
    return http<TBody>('GET', path, expectedStatus);
  }

  function post<TBody>(path: string, body: RequestBody, expectedStatus: number) {
    return http<TBody>('POST', path, expectedStatus, body);
  }

  function patch<TBody>(path: string, body: RequestBody, expectedStatus: number) {
    return http<TBody>('PATCH', path, expectedStatus, body);
  }

  function del<TBody>(path: string, expectedStatus: number) {
    return http<TBody>('DELETE', path, expectedStatus);
  }

  async function createUser(data: {
    name: string;
    email: string;
  }): Promise<UserResponse> {
    const response = await post<UserResponse>('/users', data, 201);

    return response.body;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.userProject.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await seedTestFixture(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('uses the test database configuration', () => {
    expect(process.env.DATABASE_URL).toContain('nest_prisma_test');
  });

  it('applies the test fixture idempotently', async () => {
    await seedTestFixture(prisma);
    await seedTestFixture(prisma);

    const membership = await prisma.userProject.findUnique({
      where: {
        userId_projectId: {
          userId: TEST_FIXTURE.user.id,
          projectId: TEST_FIXTURE.project.id,
        },
      },
      include: { user: true, project: true },
    });

    expect(membership?.user).toMatchObject(TEST_FIXTURE.user);
    expect(membership?.project).toMatchObject(TEST_FIXTURE.project);
    await expect(prisma.userProject.count()).resolves.toBe(1);
  });

  it('GET /users returns the seeded user', async () => {
    const response = await get<UserResponse[]>('/users', 200);

    expect(response.body).toEqual([
      expect.objectContaining(TEST_FIXTURE.user),
    ]);
  });

  it('POST /users creates a user', async () => {
    const user = await createUser(testUsers.create);

    expect(user).toMatchObject(testUsers.create);
    expect(isUUID(user.id)).toBe(true);
    expect(Number.isNaN(Date.parse(user.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(user.updatedAt))).toBe(false);
  });

  it('POST /users rejects a duplicate email', async () => {
    await createUser(testUsers.duplicate);

    const response = await post<Record<string, unknown>>(
      '/users',
      testUsers.duplicate,
      409,
    );

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: 'Email already exists',
    });
  });

  it('POST /users applies body DTO validation through the HTTP pipeline', async () => {
    const response = await post<Record<string, unknown>>(
      '/users',
      { name: '', email: 'not-an-email' },
      400,
    );

    expect(response.body).toMatchObject({
      statusCode: 400,
      message: expect.arrayContaining([
        'name should not be empty',
        'email must be an email',
      ]),
    });
  });

  it('GET /users returns all users', async () => {
    const john = await createUser(testUsers.listJohn);
    const jane = await createUser(testUsers.listJane);

    const response = await get<UserResponse[]>('/users', 200);

    expect(response.body).toEqual(expect.arrayContaining([john, jane]));
  });

  it('GET /users returns users ordered by id', async () => {
    const jane = await createUser(testUsers.orderJane);
    const john = await createUser(testUsers.orderJohn);
    const ada = await createUser(testUsers.orderAda);

    const response = await get<UserResponse[]>('/users', 200);
    const users = response.body;
    const ids = users.map((user) => user.id);

    expect(ids).toEqual(
      [...ids].sort((left, right) => left.localeCompare(right)),
    );
    expect(users).toEqual(expect.arrayContaining([jane, john, ada]));
  });

  it('GET /users/:id returns one user', async () => {
    const user = await createUser(testUsers.findOne);

    const response = await get<UserResponse>(`/users/${user.id}`, 200);

    expect(response.body).toEqual(user);
  });

  it('GET /users/:id returns not found for a missing user', async () => {
    const response = await get<Record<string, unknown>>(
      `/users/${missingUserId}`,
      404,
    );

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it.each(invalidUserIds)('GET /users/%p rejects an invalid id', async (id) => {
    const response = await get<Record<string, unknown>>(`/users/${id}`, 400);

    expect(response.body.statusCode).toBe(400);
  });

  it('PATCH /users/:id updates a user name', async () => {
    const user = await createUser(testUsers.updateName);

    const response = await patch<UserResponse>(
      `/users/${user.id}`,
      { name: 'John Updated' },
      200,
    );
    const updated = response.body;

    expect(updated).toMatchObject({
      id: user.id,
      name: 'John Updated',
      email: testUsers.updateName.email,
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(user.updatedAt),
    );
  });

  it('PATCH /users/:id updates only a user email', async () => {
    const user = await createUser(testUsers.updateEmail);

    const response = await patch<UserResponse>(
      `/users/${user.id}`,
      { email: 'john.updated@example.com' },
      200,
    );

    expect(response.body).toMatchObject({
      id: user.id,
      name: testUsers.updateEmail.name,
      email: 'john.updated@example.com',
    });
  });

  it('PATCH /users/:id allows updating a user with the same email', async () => {
    const user = await createUser(testUsers.updateSameEmail);

    const response = await patch<UserResponse>(
      `/users/${user.id}`,
      {
        name: 'John Same Email',
        email: testUsers.updateSameEmail.email,
      },
      200,
    );

    expect(response.body).toMatchObject({
      id: user.id,
      name: 'John Same Email',
      email: testUsers.updateSameEmail.email,
    });
  });

  it('PATCH /users/:id accepts an empty body and leaves the user unchanged', async () => {
    const user = await createUser(testUsers.updateEmpty);

    const response = await patch<UserResponse>(`/users/${user.id}`, {}, 200);

    expect(response.body).toMatchObject({
      id: user.id,
      name: testUsers.updateEmpty.name,
      email: testUsers.updateEmpty.email,
    });
  });

  it('PATCH /users/:id returns not found for a missing user', async () => {
    const response = await patch<Record<string, unknown>>(
      `/users/${missingUserId}`,
      { name: 'Missing User' },
      404,
    );

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it("PATCH /users/:id rejects changing an email to another user's email", async () => {
    const source = await createUser(testUsers.updateConflictSource);
    const target = await createUser(testUsers.updateConflictTarget);

    const response = await patch<Record<string, unknown>>(
      `/users/${source.id}`,
      { email: target.email },
      409,
    );

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: 'Email already exists',
    });
  });

  it.each(invalidUserIds)('PATCH /users/%p rejects an invalid id', async (id) => {
    const response = await patch<Record<string, unknown>>(
      `/users/${id}`,
      { name: 'Invalid User' },
      400,
    );

    expect(response.body.statusCode).toBe(400);
  });

  it('DELETE /users/:id deletes a user', async () => {
    const user = await createUser(testUsers.delete);

    const deleteResponse = await del<UserResponse>(`/users/${user.id}`, 200);

    expect(deleteResponse.body).toEqual(user);
    await get<Record<string, unknown>>(`/users/${user.id}`, 404);
  });

  it('DELETE /users/:id returns not found for a missing user', async () => {
    const response = await del<Record<string, unknown>>(
      `/users/${missingUserId}`,
      404,
    );

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it('DELETE /users/:id returns not found when deleting the same user twice', async () => {
    const user = await createUser(testUsers.deleteTwice);

    await del<UserResponse>(`/users/${user.id}`, 200);

    const response = await del<Record<string, unknown>>(
      `/users/${user.id}`,
      404,
    );

    expect(response.body.message).toBe('User not found');
  });

  it.each(invalidUserIds)('DELETE /users/%p rejects an invalid id', async (id) => {
    const response = await del<Record<string, unknown>>(`/users/${id}`, 400);

    expect(response.body.statusCode).toBe(400);
  });

  it('leaves deterministic data in the test database for inspection', async () => {
    const user = await createUser(testUsers.inspect);

    expect(user).toMatchObject(testUsers.inspect);
  });
});
