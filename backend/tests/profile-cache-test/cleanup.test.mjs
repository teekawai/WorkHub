// Z: xóa khóa profile:* của user do run tạo + kiểm còn 0 (luôn chạy cuối, trước khi base lib xóa user)
import { ck, dropProfileKeys, empKey, finKey, isMain, redisCmd, runAdminSuites } from "./lib.mjs";

export const name = "ZC: Dọn khóa Redis profile:*";

export default async function run() {
  const ids = globalThis.__created || [];
  const n = await dropProfileKeys(ids);
  console.log(`   🧹 đã xóa ${n} khóa profile:* của ${ids.length} user`);
  let left = 0;
  for (const id of ids) left += (await redisCmd("EXISTS", empKey(id))) + (await redisCmd("EXISTS", finKey(id)));
  ck("ZC-01", left === 0, `còn ${left} khóa profile:* của run`);
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
