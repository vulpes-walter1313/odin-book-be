import { describe, expect, test } from "@jest/globals";
import { createIdBatchesForDeletion } from "./utils";
import { faker } from "@faker-js/faker";

describe("create batches of ids", () => {
  test("create 4 batches of 10 from 35", () => {
    const idList: string[] = [];
    for (let i = 0; i < 35; i++) {
      idList.push(faker.string.nanoid(40));
    }
    const batches = createIdBatchesForDeletion(idList, 10);
    expect(batches.length).toBe(4);
  });

  test("last batch to have 5 from batches of 10 from 35", () => {
    const idList: string[] = [];
    for (let i = 0; i < 35; i++) {
      idList.push(faker.string.nanoid(40));
    }
    const batches = createIdBatchesForDeletion(idList, 10);
    expect(batches[batches.length - 1].length).toBe(5);
  });

  test("create 2 batches of 100 from 200", () => {
    const idList: string[] = [];
    for (let i = 0; i < 200; i++) {
      idList.push(faker.string.nanoid(40));
    }
    const batches = createIdBatchesForDeletion(idList, 100);
    expect(batches.length).toBe(2);
  });

  test("last batch should have 100 ids from batches of 100 from 200", () => {
    const idList: string[] = [];
    for (let i = 0; i < 200; i++) {
      idList.push(faker.string.nanoid(40));
    }
    const batches = createIdBatchesForDeletion(idList, 100);
    expect(batches[batches.length - 1].length).toBe(100);
  });

  test("last batch should have 1 id from batches of 100 from 201", () => {
    const idList: string[] = [];
    for (let i = 0; i < 201; i++) {
      idList.push(faker.string.nanoid(40));
    }
    const batches = createIdBatchesForDeletion(idList, 100);
    expect(batches[batches.length - 1].length).toBe(1);
  });
});
