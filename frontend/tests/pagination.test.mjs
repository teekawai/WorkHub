import test from "node:test";
import assert from "node:assert/strict";
import { pageWindow } from "../src/utils/pagination.js";

test("PAGE-1: ít trang hơn 3 -> hiện hết", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(2, 2), [1, 2]);
});

test("PAGE-2: trang giữa -> trang hiện tại ở giữa", () => {
  assert.deepEqual(pageWindow(5, 10), [4, 5, 6]);
});

test("PAGE-3: sát đầu / sát cuối -> vẫn đủ 3 số, không vượt biên", () => {
  assert.deepEqual(pageWindow(1, 10), [1, 2, 3]);
  assert.deepEqual(pageWindow(10, 10), [8, 9, 10]);
  assert.deepEqual(pageWindow(9, 10), [8, 9, 10]);
});

test("PAGE-4: không có trang -> rỗng", () => {
  assert.deepEqual(pageWindow(1, 0), []);
});
