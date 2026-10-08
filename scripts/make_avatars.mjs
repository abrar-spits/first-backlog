// Draws the mock board's assignee avatars (store/src/avatars/*.svg): DiceBear
// Notionists, CC0 1.0. Needs: npm i --no-save @dicebear/core @dicebear/collection
// Usage: node scripts/make_avatars.mjs
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import fs from 'fs';
const out = new URL('../store/src/avatars', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const people = { sara: 'f4c7a1', daan: 'b8d4f5', lina: 'cfe8c2', tom: 'f2c4d6', noor: 'e3d7f7' };
for (const [seed, bg] of Object.entries(people)) {
  fs.writeFileSync(`${out}/${seed}.svg`, createAvatar(notionists, { seed, backgroundColor: [bg], radius: 50 }).toString());
}
console.log(fs.readdirSync(out).join(' '));
