import {
  BadRequestException,
  ConflictException,
  INestApplication,
  NotFoundException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { UsersController } from "../src/users/users.controller";
import { UsersRepository } from "../src/users/users.repository";

const testUsers = {
  create: {
    name: "Create Test",
    email: "create.test@example.com",
  },
  duplicate: {
    name: "Duplicate Test",
    email: "duplicate.test@example.com",
  },
  listJohn: {
    name: "List John Test",
    email: "list.john.test@example.com",
  },
  listJane: {
    name: "List Jane Test",
    email: "list.jane.test@example.com",
  },
  orderJane: {
    name: "Order Jane Test",
    email: "order.jane.test@example.com",
  },
  orderJohn: {
    name: "Order John Test",
    email: "order.john.test@example.com",
  },
  orderAda: {
    name: "Order Ada Test",
    email: "order.ada.test@example.com",
  },
  findOne: {
    name: "Find One Test",
    email: "find.one.test@example.com",
  },
  updateName: {
    name: "Update Name Test",
    email: "update.name.test@example.com",
  },
  updateEmail: {
    name: "Update Email Test",
    email: "update.email.test@example.com",
  },
  updateSameEmail: {
    name: "Update Same Email Test",
    email: "update.same.email.test@example.com",
  },
  updateEmpty: {
    name: "Update Empty Test",
    email: "update.empty.test@example.com",
  },
  updateConflictSource: {
    name: "Update Conflict Source Test",
    email: "update.conflict.source.test@example.com",
  },
  updateConflictTarget: {
    name: "Update Conflict Target Test",
    email: "update.conflict.target.test@example.com",
  },
  delete: {
    name: "Delete Test",
    email: "delete.test@example.com",
  },
  deleteTwice: {
    name: "Delete Twice Test",
    email: "delete.twice.test@example.com",
  },
  inspect: {
    name: "Inspect After Tests",
    email: "inspect.after.tests@example.com",
  },
};

describe("UsersController functional tests", () => {
  let app: INestApplication;
  let usersController: UsersController;
  let usersRepository: UsersRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    usersController = app.get(UsersController);
    usersRepository = app.get(UsersRepository);

    await usersRepository.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("uses the test database configuration", () => {
    expect(process.env.DATABASE_URL).toContain("nest_prisma_test");
  });

  it("gets an empty user list after the module-level cleanup", async () => {
    await expect(usersController.findAll()).resolves.toEqual([]);
  });

  it("creates a user", async () => {
    const user = await usersController.create(testUsers.create);

    expect(user).toMatchObject(testUsers.create);
    expect(user.id).toEqual(expect.any(Number));
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects a duplicate email", async () => {
    await usersController.create(testUsers.duplicate);

    await expect(
      usersController.create(testUsers.duplicate),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("gets all users", async () => {
    const john = await usersController.create(testUsers.listJohn);
    const jane = await usersController.create(testUsers.listJane);

    await expect(usersController.findAll()).resolves.toEqual(
      expect.arrayContaining([john, jane]),
    );
  });

  it("gets all users ordered by id", async () => {
    const jane = await usersController.create(testUsers.orderJane);
    const john = await usersController.create(testUsers.orderJohn);
    const ada = await usersController.create(testUsers.orderAda);
    const users = await usersController.findAll();
    const ids = users.map((user) => user.id);

    expect(ids).toEqual([...ids].sort((left, right) => left - right));
    expect(users).toEqual(expect.arrayContaining([jane, john, ada]));
  });

  it("gets one user by id", async () => {
    const user = await usersController.create(testUsers.findOne);

    await expect(usersController.findOne(user.id)).resolves.toEqual(user);
  });

  it("throws not found for a missing user", async () => {
    await expect(usersController.findOne(999999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(["abc", "1.5", "0", "-1", Number.NaN])(
    "throws bad request for invalid find id %p",
    (id) => {
      expect(() => usersController.findOne(id)).toThrow(BadRequestException);
    },
  );

  it("updates a user", async () => {
    const user = await usersController.create(testUsers.updateName);

    const updated = await usersController.update(user.id, {
      name: "John Updated",
    });

    expect(updated).toMatchObject({
      id: user.id,
      name: "John Updated",
      email: testUsers.updateName.email,
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      user.updatedAt.getTime(),
    );
  });

  it("updates only a user email", async () => {
    const user = await usersController.create(testUsers.updateEmail);

    const updated = await usersController.update(user.id, {
      email: "john.updated@example.com",
    });

    expect(updated).toMatchObject({
      id: user.id,
      name: testUsers.updateEmail.name,
      email: "john.updated@example.com",
    });
  });

  it("updates a user with the same email", async () => {
    const user = await usersController.create(testUsers.updateSameEmail);

    const updated = await usersController.update(user.id, {
      name: "John Same Email",
      email: testUsers.updateSameEmail.email,
    });

    expect(updated).toMatchObject({
      id: user.id,
      name: "John Same Email",
      email: testUsers.updateSameEmail.email,
    });
  });

  it("updates a user with an empty body", async () => {
    const user = await usersController.create(testUsers.updateEmpty);

    const updated = await usersController.update(user.id, {});

    expect(updated).toMatchObject({
      id: user.id,
      name: testUsers.updateEmpty.name,
      email: testUsers.updateEmpty.email,
    });
  });

  it("throws not found when updating a missing user", async () => {
    await expect(
      usersController.update(999999, { name: "Missing User" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects updating a user email to another existing email", async () => {
    const source = await usersController.create(testUsers.updateConflictSource);
    const target = await usersController.create(testUsers.updateConflictTarget);

    await expect(
      usersController.update(source.id, { email: target.email }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(["abc", "1.5", "0", "-1", Number.NaN])(
    "throws bad request for invalid update id %p",
    (id) => {
      expect(() => usersController.update(id, { name: "Invalid Id" })).toThrow(
        BadRequestException,
      );
    },
  );

  it("deletes a user", async () => {
    const user = await usersController.create(testUsers.delete);

    await expect(usersController.remove(user.id)).resolves.toEqual(user);
    await expect(usersController.findOne(user.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws not found when deleting a missing user", async () => {
    await expect(usersController.remove(999999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws not found when deleting the same user twice", async () => {
    const user = await usersController.create(testUsers.deleteTwice);

    await usersController.remove(user.id);

    await expect(usersController.remove(user.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each(["abc", "1.5", "0", "-1", Number.NaN])(
    "throws bad request for invalid delete id %p",
    (id) => {
      expect(() => usersController.remove(id)).toThrow(BadRequestException);
    },
  );

  it("leaves deterministic data in the test database for inspection", async () => {
    const user = await usersController.create(testUsers.inspect);

    expect(user).toMatchObject(testUsers.inspect);
  });
});
