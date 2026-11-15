import test from "node:test";
import assert from "node:assert/strict";
import {
  validDate,
  shiftDay,
  weekDays,
  daySummary,
  validateBackup,
  makeBackup,
  validateEntry,
  habitStats,
  splitBackups,
} from "../public/domain.js";
const photo = "data:image/jpeg;base64,/9j/2Q==";
const entry = {
  id: "meal-1",
  date: "2026-11-09",
  time: "12:30",
  meal: "lunch",
  note: "鸡肉饭",
  feeling: "just",
  photo,
  updatedAt: "2026-11-09T05:00:00.000Z",
};
test("date-only arithmetic handles year boundaries and leap days", () => {
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDay("2024-02-28", 1), "2024-02-29");
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(weekDays("2026-11-09")[0], "2026-11-09");
});
test("daily progress counts distinct main meals, not snacks or repeated photos", () => {
  const items = [
    entry,
    { ...entry, id: "2" },
    { ...entry, id: "3", meal: "snack" },
  ];
  assert.deepEqual(daySummary(items, "2026-11-09"), {
    records: 3,
    mainMeals: 1,
  });
});
test("backup round trip preserves photos and training days", () => {
  const source = makeBackup([entry], ["2026-11-09"]);
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(source))).entries, [
    entry,
  ]);
  assert.deepEqual(validateBackup(source).trainingDays, ["2026-11-09"]);
});
test("malformed or dangerous import is rejected before any write", () => {
  for (const invalid of [
    { ...entry, date: "2026-02-30" },
    { ...entry, photo: "javascript:evil" },
    { ...entry, meal: "wrong" },
    { ...entry, time: "25:00" },
    { ...entry, note: "a".repeat(501) },
  ])
    assert.throws(() => validateEntry(invalid));
  assert.throws(() =>
    validateBackup({ format: "other", version: 1, entries: [entry] }),
  );
  assert.throws(() =>
    validateBackup({ ...makeBackup([entry], []), entries: [entry, entry] }),
  );
});
test("a meal can be recorded with text alone, but cannot be completely empty", () => {
  assert.equal(validateEntry({ ...entry, photo: "" }).note, "鸡肉饭");
  assert.throws(() => validateEntry({ ...entry, photo: "", note: "  " }));
});
test("future meals cannot be checked in", () => {
  assert.throws(() => validateEntry({ ...entry, date: "2099-01-01" }));
});
test("streak tolerates an unfinished today and stops at the first missing day", () => {
  const items = ["2026-11-08", "2026-11-09"].map((date) => ({
    ...entry,
    date,
  }));
  assert.equal(habitStats(items, "2026-11-10").streak, 2);
  assert.equal(habitStats(items, "2026-11-11").streak, 0);
  assert.equal(habitStats(items, "2026-11-09").days, 2);
});
test("large exports split into independently restorable files without losing entries", () => {
  const items = Array.from({ length: 5001 }, (_, i) => ({
    ...entry,
    id: `entry-${i}`,
  }));
  const parts = splitBackups(items, []);
  assert.equal(parts.length, 2);
  assert.equal(
    parts.flatMap((part) => validateBackup(part).entries).length,
    5001,
  );
});
test("backup splitting respects UTF-8 byte size and keeps training metadata in every part", () => {
  const items = Array.from({ length: 8 }, (_, i) => ({
    ...entry,
    id: `meal-${i}`,
    note: "中文饮食日记".repeat(8),
  }));
  const parts = splitBackups(items, ["2026-11-09"], 1200);
  assert.ok(parts.length > 1);
  for (const part of parts) {
    assert.ok(new TextEncoder().encode(JSON.stringify(part)).length <= 1200);
    assert.deepEqual(validateBackup(part).trainingDays, ["2026-11-09"]);
  }
  assert.equal(parts.flatMap((p) => p.entries).length, 8);
});
