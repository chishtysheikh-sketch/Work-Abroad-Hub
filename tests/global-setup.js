// Runs once before all test files: start a throw-away MongoDB in memory, stop it at the end.
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod;

export async function setup({ provide }) {
  mongod = await MongoMemoryServer.create({ instance: { ip: "127.0.0.1" } });
  provide("mongoUri", mongod.getUri());
}

export async function teardown() {
  await mongod?.stop();
}
