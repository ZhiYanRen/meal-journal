export const MEALS = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};
export const FEELINGS = { just: "刚刚好", full: "有点撑", hungry: "还没饱" };
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const d = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(+d) &&
    localDay(d) === value &&
    value >= "2000-01-01" &&
    value <= "2100-12-31"
  );
}
export function shiftDay(day, offset) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return localDay(d);
}
export function weekDays(day) {
  const d = new Date(`${day}T12:00:00`);
  const start = shiftDay(day, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
}
export function daySummary(entries, day) {
  const records = entries.filter((e) => e.date === day);
  return {
    records: records.length,
    mainMeals: new Set(
      records.filter((e) => e.meal !== "snack").map((e) => e.meal),
    ).size,
  };
}
export function habitStats(entries, today = localDay()) {
  const dates = new Set(entries.map((e) => e.date));
  let cursor = dates.has(today) ? today : shiftDay(today, -1),
    streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return {
    days: dates.size,
    streak,
    complete: [...dates].filter(
      (day) => daySummary(entries, day).mainMeals === 3,
    ).length,
  };
}
export function validateEntry(e) {
  if (
    !e ||
    typeof e !== "object" ||
    typeof e.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(e.id)
  )
    throw Error("记录编号无效");
  if (
    !validDate(e.date) ||
    e.date > localDay() ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)
  )
    throw Error("记录日期或时间无效，不能提前打卡");
  if (
    !Object.hasOwn(MEALS, e.meal) ||
    typeof e.note !== "string" ||
    e.note.length > 500 ||
    !(e.feeling === "" || Object.hasOwn(FEELINGS, e.feeling))
  )
    throw Error("餐次、备注或感受无效");
  if (
    typeof e.photo !== "string" ||
    e.photo.length > 12000000 ||
    (e.photo !== "" &&
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        e.photo,
      ))
  )
    throw Error("照片格式无效，请使用 JPEG、PNG 或 WebP");
  if (!e.photo && !e.note.trim()) throw Error("写下吃了什么，或添加一张照片");
  if (typeof e.updatedAt !== "string" || Number.isNaN(Date.parse(e.updatedAt)))
    throw Error("记录更新时间无效");
  return {
    id: e.id,
    date: e.date,
    time: e.time,
    meal: e.meal,
    note: e.note,
    feeling: e.feeling,
    photo: e.photo,
    updatedAt: e.updatedAt,
  };
}
export function makeBackup(entries, trainingDays) {
  return {
    format: "meal-journal",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    trainingDays,
  };
}
export function splitBackups(
  entries,
  trainingDays,
  maxBytes = 100 * 1024 * 1024,
) {
  const encoder = new TextEncoder(),
    empty = makeBackup([], trainingDays),
    base = encoder.encode(JSON.stringify(empty)).length,
    parts = [];
  let group = [],
    size = base;
  for (const entry of entries) {
    const bytes = encoder.encode(JSON.stringify(entry)).length;
    if (base + bytes > maxBytes) throw Error("单条记录超过备份大小限制");
    if (group.length && (group.length >= 5000 || size + bytes + 1 > maxBytes)) {
      parts.push({ ...empty, entries: group });
      group = [];
      size = base;
    }
    size += bytes + (group.length ? 1 : 0);
    group.push(entry);
  }
  if (group.length || !parts.length) parts.push({ ...empty, entries: group });
  return parts;
}
export function validateBackup(data) {
  if (
    !data ||
    data.format !== "meal-journal" ||
    data.version !== 1 ||
    !Array.isArray(data.entries) ||
    data.entries.length > 5000 ||
    !Array.isArray(data.trainingDays) ||
    data.trainingDays.length > 37000
  )
    throw Error("这不是支持的餐记备份文件");
  const entries = data.entries.map(validateEntry);
  if (new Set(entries.map((e) => e.id)).size !== entries.length)
    throw Error("备份含重复记录编号");
  if (data.trainingDays.some((day) => !validDate(day)))
    throw Error("备份中的训练日无效");
  return { entries, trainingDays: [...new Set(data.trainingDays)] };
}
