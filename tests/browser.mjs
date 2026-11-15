import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
let base = process.env.TEST_URL;
const server = base
  ? null
  : spawn(process.execPath, ["scripts/serve.mjs"], {
      stdio: "pipe",
      env: { ...process.env, PORT: "0" },
    });
if (server)
  await new Promise((resolve, reject) => {
    server.stdout.once("data", (data) => {
      base = data.toString().match(/http:\/\/\S+/)[0];
      resolve();
    });
    server.once("error", reject);
    server.once("exit", (code) => reject(Error(`Preview exited ${code}`)));
  });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "darwin"
    ? {
        executablePath:
          process.env.BROWSER_EXECUTABLE ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      }
    : {}),
});
await mkdir("work", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 1024 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "今日三餐", exact: true }),
  ).toBeVisible();
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await page.getByRole("button", { name: "记录早餐", exact: true }).click();
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.locator("#form-error")).toContainText("写下");
  await page.locator("#entry-note").fill("番茄鸡蛋面与水果");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.locator("#editor")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "编辑早餐：番茄鸡蛋面与水果" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "编辑早餐：番茄鸡蛋面与水果" }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "编辑早餐：番茄鸡蛋面与水果" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "编辑早餐：番茄鸡蛋面与水果" })
    .click();
  await page.locator("#entry-note").fill("燕麦、牛奶与水果");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "编辑早餐：燕麦、牛奶与水果" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "记录午餐", exact: true }).click();
  await page.locator("#entry-note").fill("午餐照片测试");
  await page.locator("#album-file").setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken image"),
  });
  await expect(page.locator("#form-error")).toContainText("无法读取");
  await expect(page.locator("#entry-note")).toHaveValue("午餐照片测试");
  await page
    .locator("#album-file")
    .setInputFiles(path.resolve("public/assets/icon-192.png"));
  await expect(page.locator("#photo-preview")).toBeVisible();
  await page.evaluate(() => {
    window.originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("存储空间不足", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.locator("#form-error")).toContainText("未能保存");
  await expect(page.locator("#photo-preview")).toBeVisible();
  await expect(page.locator("#entry-note")).toHaveValue("午餐照片测试");
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.originalPut;
  });
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.locator(".meal-photo")).toHaveCount(1);
  await page.getByRole("button", { name: "编辑午餐：午餐照片测试" }).click();
  await page.evaluate(() => {
    window.originalDecode = Image.prototype.decode;
    Image.prototype.decode = function () {
      return window.originalDecode.call(this).then(
        () =>
          new Promise((resolve) => {
            window.completeDecode = resolve;
          }),
      );
    };
  });
  await page
    .locator("#album-file")
    .setInputFiles(path.resolve("public/assets/icon-192.png"));
  await page.waitForFunction(() => typeof window.completeDecode === "function");
  await expect(page.locator('[data-editor="remove-photo"]')).toBeDisabled();
  await page.getByRole("button", { name: "关闭记录窗口" }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
  await page.evaluate(() => {
    Image.prototype.decode = window.originalDecode;
    window.completeDecode();
  });
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.getByRole("button", { name: "记录晚餐", exact: true }).click();
  await page.locator("#entry-note").fill("蔬菜与米饭");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "三餐齐了，今天也很棒。" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "编辑早餐：燕麦、牛奶与水果" })
    .click();
  await page.locator("#entry-note").fill("未保存的修改");
  await page.getByRole("button", { name: "关闭记录窗口" }).click();
  await expect(page.locator("#confirmation")).toBeVisible();
  await expect(page.locator('#confirmation [data-confirm="no"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#editor")).toBeVisible();
  await page.getByRole("button", { name: "关闭记录窗口" }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "编辑早餐：燕麦、牛奶与水果" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "日历回看" }).click();
  await page
    .getByRole("button", {
      name: new RegExp(
        `${Number(today.slice(5, 7))}月${Number(today.slice(8))}日.*3 餐，3 条记录`,
      ),
    })
    .click();
  await expect(page.locator(".detail-entry")).toHaveCount(3);
  await page.getByRole("link", { name: "我的手帐" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出备份" }).click();
  const download = await downloadPromise;
  await download.saveAs("work/test.backup.json");
  const backup = JSON.parse(await readFile("work/test.backup.json", "utf8"));
  assert.equal(backup.entries.length, 3);
  assert.ok(backup.entries.some((e) => e.photo.startsWith("data:image/jpeg")));
  await page
    .locator("#backup-file")
    .setInputFiles(path.resolve("work/test.backup.json"));
  await page.getByRole("button", { name: "合并导入", exact: true }).click();
  await expect(page.locator("#backup-status")).toContainText("已导入 0 条");
  await page.locator("#backup-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"bad":1}'),
  });
  await expect(page.locator("#backup-status")).toContainText("未能导入");
  await page.getByRole("link", { name: "今日打卡" }).click();
  await page.getByRole("button", { name: "编辑午餐：午餐照片测试" }).click();
  await page.getByRole("button", { name: "删除这一餐", exact: true }).click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.locator(".meal-photo")).toHaveCount(0);
  // A second tab must not silently overwrite edits made elsewhere.
  await page
    .getByRole("button", { name: "编辑早餐：燕麦、牛奶与水果" })
    .click();
  const other = await context.newPage();
  await other.goto(base);
  await other
    .getByRole("button", { name: "编辑早餐：燕麦、牛奶与水果" })
    .click();
  await other.locator("#entry-note").fill("另一个标签更新");
  await other.getByRole("button", { name: "保存记录", exact: true }).click();
  await page.locator("#entry-note").fill("旧表单内容");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(page.locator("#form-error")).toContainText("其他标签页");
  await expect(page.locator("#entry-note")).toHaveValue("旧表单内容");
  await page.getByRole("button", { name: "关闭记录窗口" }).click();
  await page.getByRole("button", { name: "放弃修改", exact: true }).click();
  await other.close();
  for (const [name, width, height] of [
    ["ipad-landscape", 1180, 820],
    ["ipad-portrait", 820, 1180],
    ["phone", 390, 844],
    ["phone-landscape", 844, 390],
    ["pc", 1440, 1000],
    ["small-phone", 320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("link", { name: "今日打卡" }).click();
    await expect(
      page.getByRole("button", { name: "记录午餐", exact: true }),
    ).toBeVisible();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${name} horizontal overflow`,
    );
    await page.screenshot({
      path: `work/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "记录午餐", exact: true }).click();
    await page.locator("#entry-note").fill("测试窄屏表单");
    await page
      .getByRole("button", { name: "保存记录", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", { name: "保存记录", exact: true }),
    ).toBeInViewport();
    await page.getByRole("button", { name: "关闭记录窗口" }).click();
    await page.getByRole("button", { name: "放弃修改", exact: true }).click();
    await page.getByRole("link", { name: "日历回看" }).click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${name} calendar overflow`,
    );
    await page.getByRole("link", { name: "我的手帐" }).click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${name} settings overflow`,
    );
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "今日打卡" }).click();
  await page.getByRole("button", { name: "记录午餐", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#editor")).not.toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "今日三餐", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "记录午餐", exact: true }).click();
  await page.locator("#entry-note").fill("离线也可以记录");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "编辑午餐：离线也可以记录" }),
  ).toBeVisible();
  await context.setOffline(false);
  const fresh = await browser.newContext({
      viewport: { width: 1180, height: 820 },
    }),
    freshPage = await fresh.newPage();
  await freshPage.goto(base);
  await expect(
    freshPage.getByRole("heading", { name: "今日三餐", exact: true }),
  ).toBeVisible();
  await freshPage.screenshot({
    path: "work/first-use-ipad.png",
    fullPage: true,
    animations: "disabled",
  });
  await freshPage.getByRole("link", { name: "我的手帐" }).click();
  await freshPage
    .locator("#backup-file")
    .setInputFiles(path.resolve("work/test.backup.json"));
  await freshPage
    .getByRole("button", { name: "合并导入", exact: true })
    .click();
  await expect(freshPage.locator("#backup-status")).toContainText(
    "已导入 3 条",
  );
  await freshPage.getByRole("link", { name: "日历回看" }).click();
  await expect(freshPage.locator(".detail-entry")).toHaveCount(3);
  await fresh.close();
  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    window.realIndexedDB = window.indexedDB;
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
        open() {
          throw Error("存储不可用");
        },
      },
    });
  });
  const deniedPage = await denied.newPage();
  await deniedPage.goto(base);
  await expect(
    deniedPage.getByRole("heading", { name: "暂时无法打开饮食手帐" }),
  ).toBeVisible();
  await deniedPage.evaluate(() =>
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: window.realIndexedDB,
    }),
  );
  await deniedPage.getByRole("button", { name: "重新打开" }).click();
  await expect(
    deniedPage.getByRole("heading", { name: "今日三餐", exact: true }),
  ).toBeVisible();
  await denied.close();
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: text/photo CRUD, validation, persistence, backup merge/reject/new device restore, conflict, storage denied/quota retry, broken photo recovery, keyboard, 6 viewports, reduced motion, offline.",
  );
} finally {
  await context.close();
  await browser.close();
  server?.kill();
}
