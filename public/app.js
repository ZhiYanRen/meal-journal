import {
  MEALS,
  FEELINGS,
  localDay,
  shiftDay,
  weekDays,
  daySummary,
  habitStats,
  validateEntry,
  validateBackup,
  splitBackups,
} from "./domain.js";
import * as store from "./store.js";

const $ = (s) => document.querySelector(s),
  esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const paths = {
  today:
    '<rect x="4" y="5" width="16" height="16" rx="4"/><path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m4 0h1m4 0h1m-10 3h1m4 0h1"/>',
  settings:
    '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  camera:
    '<path d="m8 6 2-3h4l2 3h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  leaf: '<path d="M20 3C8 2 2 9 6 16s16 2 14-13Z"/><path d="m4 21 11-12"/>',
  snack: '<path d="M5 8h14l-2 13H7Zm-1 0h16M9 8V4h6v4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  note: '<path d="M6 3h9l4 4v14H5V3Zm8 0v5h5M8 12h8m-8 4h5"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
};
function icon(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.note}</svg>`;
}
const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
function dateLabel(day) {
  const d = new Date(`${day}T12:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日 · 星期${weekdays[d.getDay()]}`;
}
const state = {
  entries: [],
  trainingDays: [],
  date: localDay(),
  month: localDay().slice(0, 7),
  ready: false,
  error: "",
  busy: false,
};
const content = $("#content"),
  editor = $("#editor"),
  confirmation = $("#confirmation");
let draft = null,
  returnFocus = null,
  toastTimer,
  confirmationResolve,
  photoGeneration = 0,
  loadSequence = 0;
const channel =
  "BroadcastChannel" in window ? new BroadcastChannel("meal-journal") : null;
function notify(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3800);
}
function currentView() {
  return location.hash.slice(1) || "today";
}
function button(label, action, type = "outline", symbol = "") {
  return `<button class="button ${type}" data-action="${action}">${symbol ? icon(symbol) : ""}<span>${label}</span></button>`;
}
function ring(count) {
  return `<div class="progress-ring" aria-label="三餐已打卡 ${count} 餐，共 3 餐"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="42"/><circle class="ring-value" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="${264 * (1 - count / 3)}"/></svg><div class="ring-number"><strong>${count}<span class="muted">/3</span></strong><small>三餐进度</small></div></div>`;
}
function mealArt(meal) {
  const art = {
    breakfast:
      '<ellipse cx="105" cy="127" rx="70" ry="12" fill="#E8C8A7" opacity=".45"/><path d="M54 52q-4-26 27-27h45q31 1 26 27v65H54Z" fill="#E0A463" stroke="#A46433" stroke-width="2"/><path d="M64 57q-8-20 16-21h47q23 0 15 21v49H64Z" fill="#FFF1CC"/><circle cx="100" cy="77" r="22" fill="#fff"/><path d="M95 54q-30-11-30 10t5 29q-7 18 16 20t21-17q29 12 31-10t-17-19q6-19-11-19Z" fill="#fff"/><circle cx="101" cy="78" r="15" fill="#EAB75A"/><path d="M36 112q-13-24 9-39l12 19Z" fill="#6C9970"/><path d="M149 112q-7-22 13-31 17 21-3 36Z" fill="#739D72"/>',
    lunch:
      '<ellipse cx="105" cy="126" rx="72" ry="13" fill="#AFCBB3" opacity=".4"/><path d="M34 72h142q-7 61-71 61T34 72Z" fill="#FDFEFA" stroke="#7B9C85" stroke-width="2"/><ellipse cx="105" cy="72" rx="71" ry="28" fill="#D5E5D0" stroke="#7B9C85" stroke-width="2"/><path d="M58 75q-4-28 29-30t43 20q6 20-29 22T58 75Z" fill="#fff"/><path d="M119 52q12-28 26-10 24-4 16 16 12 19-9 21l-30-10Z" fill="#6F9A6A"/><path d="m49 59 19-10 16 27-20 8Z" fill="#DD9B67"/><path d="m52 64 21-10m-17 17 20-11" stroke="#BB7C4E" stroke-width="2"/><circle cx="139" cy="76" r="9" fill="#D88064"/><path d="m105 30 46-21m-34 23 41-19" stroke="#B68F60" stroke-width="4" stroke-linecap="round"/>',
    dinner:
      '<ellipse cx="105" cy="128" rx="74" ry="12" fill="#C9BDDA" opacity=".4"/><ellipse cx="103" cy="88" rx="77" ry="43" fill="#fff" stroke="#A499B9" stroke-width="2"/><ellipse cx="103" cy="86" rx="59" ry="29" fill="#F2EFF6"/><path d="M91 73q15-17 45 0t-4 27q-47 9-52-6Z" fill="#E9B27D" stroke="#C58A59" stroke-width="2"/><path d="m103 73-7 19m20-16-7 22m22-16-6 16" stroke="#C58A59" stroke-width="3"/><path d="M51 82q-8-18 5-24 13-9 20 4 19 3 13 17-17 20-38 3Z" fill="#739875"/><circle cx="70" cy="100" r="9" fill="#D6816E"/><circle cx="55" cy="96" r="7" fill="#E8B05D"/><path d="M176 45v69m-7-69v17q7 10 14 0V45M24 46v68m0-69q-15 16 0 32" stroke="#A499B9" stroke-width="3" stroke-linecap="round"/>',
  };
  return `<div class="meal-art ${meal}"><svg viewBox="0 0 210 155" aria-hidden="true">${art[meal]}</svg></div>`;
}
function sortedEntries(date, meal) {
  return state.entries
    .filter((e) => e.date === date && (!meal || e.meal === meal))
    .sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
}
function entryRow(e) {
  return `<button class="entry-row" data-edit="${e.id}" aria-label="编辑${MEALS[e.meal]}：${esc(e.note || "照片记录")}"><span>${esc(e.note || "照片记录")}</span><time>${e.time}</time></button>`;
}
function mealCard(meal) {
  const items = sortedEntries(state.date, meal),
    photo = items.find((e) => e.photo)?.photo;
  const hints = {
    breakfast: "开启元气满满的一天",
    lunch: "忙碌中，也要好好吃饭",
    dinner: "用一餐美好，结束今天",
  };
  return `<article class="meal-card panel">${photo ? `<img class="meal-photo" src="${photo}" alt="${MEALS[meal]}的饮食照片">` : mealArt(meal)}<div class="meal-body"><div class="meal-title"><h3>${MEALS[meal]}</h3><span class="meal-tag ${items.length ? "done" : ""}">${items.length ? "已打卡" : "待记录"}</span></div>${items.length ? items.map(entryRow).join("") : `<p>${hints[meal]}</p>`}<button class="meal-add" data-add="${meal}">${icon("plus")}${items.length ? "再记一份" : `记录${MEALS[meal]}`}</button></div></article>`;
}
function review() {
  const stats = habitStats(state.entries),
    week = weekDays(localDay()),
    days = week.filter((d) => state.entries.some((e) => e.date === d)).length;
  return `<aside class="aside-column"><section class="panel review-panel"><p class="eyebrow">LITTLE BY LITTLE</p><h2>每一点坚持，都算数</h2><div class="stat-row"><span>连续记录</span><strong>${stats.streak}<small>天</small></strong></div><div class="stat-row"><span>本周记录</span><strong>${days}<small>/ 7 天</small></strong></div><div class="week-chart" aria-label="本周每日三餐打卡情况">${week
    .map((d) => {
      const n = daySummary(state.entries, d).mainMeals;
      return `<div class="chart-day" aria-label="${dateLabel(d)}，${n} 餐"><div class="chart-track"><div class="chart-bar" style="height:${(n / 3) * 100}%"></div></div><span>${weekdays[new Date(`${d}T12:00:00`).getDay()]}</span></div>`;
    })
    .join(
      "",
    )}</div></section><section class="panel aside-note">${icon("leaf")}<h3>记录饮食，<br>也是照顾自己。</h3><p>不用计算每一卡路里。<br>记下吃了什么，留意身体的感受。<br>从今天这一餐开始就好。</p></section></aside>`;
}
function header(title, subtitle, eyebrow, add = true) {
  return `<header class="page-header"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div><div class="header-actions">${add ? button("回到今天", "today", "outline", "today") + button("记一餐", "add", "accent", "plus") : ""}</div></header>`;
}
function renderToday() {
  const count = daySummary(state.entries, state.date).mainMeals,
    isToday = state.date === localDay(),
    snacks = sortedEntries(state.date, "snack");
  return `${header(isToday ? "好好吃饭，慢慢记录。" : dateLabel(state.date), isToday ? `${dateLabel(state.date)} · 把每一餐，记成好习惯。` : "回看这一天，也可以补上漏记的餐点。", "YOUR DAILY TABLE")}<div class="workspace"><div class="main-column"><section class="panel week-strip" aria-label="选择记录日期"><button class="icon-button" data-action="week-prev" aria-label="上一周">${icon("left")}</button>${weekDays(
    state.date,
  )
    .map(
      (d) =>
        `<button class="week-day ${d === state.date ? "selected" : ""} ${d === localDay() ? "today" : ""} ${state.entries.some((e) => e.date === d) ? "recorded" : ""}" data-date="${d}" aria-label="${dateLabel(d)}" aria-pressed="${d === state.date}" ${d > localDay() ? "disabled" : ""}><small>周${weekdays[new Date(`${d}T12:00:00`).getDay()]}</small><strong>${Number(d.slice(-2))}</strong><span class="dot"></span></button>`,
    )
    .join(
      "",
    )}<button class="icon-button" data-action="week-next" aria-label="下一周" ${weekDays(state.date)[6] >= localDay() ? "disabled" : ""}>${icon("right")}</button></section><section class="panel progress-panel">${ring(count)}<div class="progress-copy"><h2>${count === 3 ? "三餐齐了，今天也很棒。" : count === 0 ? "从一餐开始，给生活一点仪式感。" : "好习惯，就藏在一餐一饭里。"}</h2><p>${count === 3 ? "好好吃饭的小事，值得一个小小的庆祝。" : `这一天已记录 ${count} 餐 · ${3 - count} 餐等待你的美味记忆`}</p></div></section><div class="section-heading"><h2>${isToday ? "今日三餐" : "这一天的三餐"}</h2><span>照片或文字，都可以</span></div><div class="meal-grid">${["breakfast", "lunch", "dinner"].map(mealCard).join("")}</div><section class="panel snack-panel"><div class="snack-label">${icon("snack")}<div><h3>还有一点小美好</h3><p>水果、咖啡，或一份小点心</p></div></div><button class="button ghost" data-add="snack">${icon("plus")}记个加餐</button></section>${snacks.length ? `<section class="panel snack-entries" aria-label="加餐记录">${snacks.map(entryRow).join("")}</section>` : ""}<p class="day-note">${icon("shield")}你的饮食日记只保存在当前浏览器，记得定期备份。</p></div>${review()}</div>`;
}
function detailEntries() {
  const entries = sortedEntries(state.date);
  return entries.length
    ? `<div class="panel detail-list">${entries.map((e) => `<button class="detail-entry" data-edit="${e.id}">${e.photo ? `<img src="${e.photo}" alt="${MEALS[e.meal]}照片" loading="lazy">` : `<span class="detail-thumb">${icon("note")}</span>`}<span><strong>${MEALS[e.meal]} · ${e.time}</strong><p>${esc(e.note || "一份美味的照片记忆")}</p><small>${FEELINGS[e.feeling] || "已记录"}</small></span>${icon("right")}</button>`).join("")}</div>`
    : `<section class="panel empty-state">${icon("note")}<h3>这一天，还没有留下记录</h3><p>想起吃了什么？随时补记一餐。</p>${button("记一餐", "add", "accent", "plus")}</section>`;
}
function renderCalendar() {
  const first = `${state.month}-01`,
    date = new Date(`${first}T12:00:00`),
    length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
    padding = (date.getDay() + 6) % 7;
  return `${header("每一餐，都有迹可循。", "翻翻日历，看看好好吃饭的日子。", "A TASTE OF EVERY DAY")}<div class="workspace"><div class="main-column"><section class="panel"><div class="month-heading"><button class="icon-button" data-action="month-prev" aria-label="上个月">${icon("left")}</button><h2>${date.getFullYear()}年 ${date.getMonth() + 1}月</h2><button class="icon-button" data-action="month-next" aria-label="下个月" ${state.month >= localDay().slice(0, 7) ? "disabled" : ""}>${icon("right")}</button></div><div class="calendar-week">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<span>周${d}</span>`).join("")}</div><div class="calendar-grid" aria-label="${state.month} 记录日历">${'<span aria-hidden="true"></span>'.repeat(padding)}${Array.from(
    { length },
    (_, i) => {
      const day = `${state.month}-${String(i + 1).padStart(2, "0")}`,
        summary = daySummary(state.entries, day);
      return `<button class="calendar-day ${summary.records ? "has-entry" : ""} ${summary.mainMeals === 3 ? "complete" : ""} ${day === state.date ? "selected" : ""} ${day === localDay() ? "is-today" : ""}" data-date="${day}" aria-pressed="${day === state.date}" aria-label="${dateLabel(day)}，${summary.mainMeals} 餐，${summary.records} 条记录" ${day > localDay() ? "disabled" : ""}><strong>${i + 1}</strong><small>${summary.records ? `${summary.mainMeals}/3 餐` : ""}</small></button>`;
    },
  ).join(
    "",
  )}</div></section><section class="calendar-detail"><div class="section-heading"><h2>${dateLabel(state.date)}</h2><span>${daySummary(state.entries, state.date).records} 条记录</span></div>${detailEntries()}</section></div>${review()}</div>`;
}
function renderSettings() {
  const stats = habitStats(state.entries);
  return `${header("我的小小饮食手帐。", "留住美味，也留住照顾自己的每一天。", "MADE FOR YOUR EVERYDAY", false)}<section class="settings-stats"><div class="panel settings-stat"><strong>${stats.days}</strong><small>累计记录天数</small></div><div class="panel settings-stat"><strong>${stats.complete}</strong><small>三餐完整的日子</small></div><div class="panel settings-stat"><strong>${state.entries.length}</strong><small>美味记录</small></div></section><div class="settings-grid"><section class="panel settings-card"><h2>${icon("shield")}给回忆一份备份</h2><p>照片与文字只保存在当前浏览器。更换设备、清理浏览器数据或卸载浏览器前，请先导出备份。</p><div class="inline-actions">${button("导出备份", "export", "", "download")}${button("导入备份", "import", "outline", "upload")}</div><input type="file" id="backup-file" accept=".json,application/json" hidden><div id="backup-files" class="inline-actions"></div><div id="backup-status" class="status-text" role="status"></div><details><summary>备份会包含什么？</summary><p>全部饮食文字、压缩后的照片和日期。备份可能含有你的私人照片，请妥善保管。导入会合并新记录，相同编号保留本机版本，不覆盖已有内容。不会自动跨设备同步。</p></details></section><section class="panel settings-card"><h2>${icon("leaf")}放在手边，随时记录</h2><p>可以把餐记添加到主屏幕，像 App 一样打开。首次联网加载后，可离线记录，数据仍保存在本机。</p><details open><summary>怎样添加到主屏幕？</summary><ul><li>iPad / iPhone：用 Safari 打开，点分享，再选“添加到主屏幕”。</li><li>Android：在浏览器菜单中选“安装应用”或“添加到主屏幕”。</li><li>电脑：使用浏览器地址栏的安装入口（如有）。</li></ul></details><div class="offline-pill" id="offline-state">${icon("check")}<span>${offlineStatus()}</span></div></section><section class="panel settings-card"><h2>${icon("camera")}关于照片记录</h2><p>可以直接拍照，也可以从相册选择。每条记录一张照片，同一餐可以添加多条。没有照片时，写下吃了什么也可以。</p><p>支持 JPEG、PNG、WebP 等浏览器可读取的图片；照片压缩为最长边 1600 像素，不保留原图。HEIC 无法读取时，请先转成 JPEG。</p></section><section class="panel settings-card"><h2>${icon("spark")}小事，也值得认真</h2><p>连续记录按每天至少一条计算；今天还没记录时，保留截至昨天的连续天数。三餐进度只计算早餐、午餐、晚餐，加餐单独留存。</p><p>餐记不估算热量，也不评价食物好坏。认真记下一餐，就是一个好的开始。</p></section></div><p class="version-note">餐记 1.0 · 每一餐，都值得记录。</p>`;
}
let backupUrls = [];
let cacheReady = false;
function offlineStatus() {
  return cacheReady
    ? "离线资源已就绪"
    : navigator.onLine
      ? "正在准备离线资源，首次使用请保持联网"
      : "当前离线；记录仍可保存到本机";
}
function render() {
  const view = currentView();
  $("#navigation").innerHTML = [
    ["today", "今日打卡"],
    ["calendar", "日历回看"],
    ["settings", "我的手帐"],
  ]
    .map(
      ([key, label]) =>
        `<a class="nav-item" href="#${key}" ${view === key ? 'aria-current="page"' : ""}>${icon(key)}<span>${label}</span></a>`,
    )
    .join("");
  document.title = `${{ today: "今日", calendar: "日历", settings: "我的" }[view] || "页面"} · 餐记`;
  if (state.error) {
    content.innerHTML = `<section class="panel error-panel"><h1>暂时无法打开饮食手帐</h1><p>${esc(state.error)}。请检查浏览器是否允许本机存储，关闭其他餐记标签页后重试。</p>${button("重新打开", "retry", "", "refresh")}</section>`;
    return;
  }
  if (!state.ready) return;
  content.innerHTML =
    view === "today"
      ? renderToday()
      : view === "calendar"
        ? renderCalendar()
        : view === "settings"
          ? renderSettings()
          : `${header("这一页还没有摆上餐桌。", "回到今日，继续记录你的美味。", "MEAL JOURNAL", false)}${button("回到今日", "today", "", "today")}`;
}
async function load() {
  const sequence = ++loadSequence;
  try {
    const data = await store.readAll();
    if (sequence !== loadSequence) return;
    state.entries = data.entries;
    state.trainingDays = data.trainingDays;
    state.ready = true;
    state.error = "";
    render();
  } catch (error) {
    if (sequence !== loadSequence) return;
    state.error = error.message || "本机存储不可用";
    render();
  }
}
function changed() {
  channel?.postMessage("changed");
  return load();
}
function requestConfirm(title, description, label = "删除", danger = true) {
  if (confirmation.open) return Promise.resolve(false);
  const focus = document.activeElement;
  confirmation.innerHTML = `<div class="confirm-body"><h2 id="confirm-title">${esc(title)}</h2><p id="confirm-description">${esc(description)}</p><div class="dialog-actions"><button class="button outline" data-confirm="no" autofocus>取消</button><button class="button ${danger ? "danger" : ""}" data-confirm="yes">${esc(label)}</button></div></div>`;
  confirmation.showModal();
  return new Promise((resolve) => {
    confirmationResolve = (value) => {
      confirmation.close();
      confirmationResolve = null;
      if (focus?.isConnected) focus.focus();
      resolve(value);
    };
  });
}
confirmation.addEventListener("cancel", (e) => {
  e.preventDefault();
  confirmationResolve?.(false);
});
confirmation.addEventListener("click", (e) => {
  const choice = e.target.closest("[data-confirm]");
  if (choice) confirmationResolve?.(choice.dataset.confirm === "yes");
});
function defaultMeal() {
  const hour = new Date().getHours();
  return hour < 10
    ? "breakfast"
    : hour < 15
      ? "lunch"
      : hour < 21
        ? "dinner"
        : "snack";
}
function openEditor(meal = defaultMeal(), entry = null) {
  if (editor.open || state.busy) return;
  returnFocus = document.activeElement;
  const now = new Date();
  draft = {
    entry,
    id: entry?.id || crypto.randomUUID(),
    meal: entry?.meal || meal,
    photo: entry?.photo || "",
    feeling: entry?.feeling || "",
    dirty: false,
    processing: false,
  };
  editor.innerHTML = `<div class="dialog-head"><h2 id="editor-title">${entry ? "编辑这一餐" : "记下这一餐"}</h2><button class="icon-button" type="button" data-editor="close" aria-label="关闭记录窗口">${icon("close")}</button></div><form class="editor-form" novalidate><p class="form-hint">留一张照片，或写下吃了什么。</p><fieldset class="meal-options"><legend>这是哪一餐？</legend>${Object.entries(
    MEALS,
  )
    .map(
      ([key, label]) =>
        `<button type="button" class="choice" data-meal="${key}" aria-pressed="${key === draft.meal}">${label}</button>`,
    )
    .join(
      "",
    )}</fieldset><div class="field-row"><label class="field"><span>日期</span><input id="entry-date" type="date" value="${entry?.date || state.date}" min="2000-01-01" max="${localDay()}" required aria-describedby="form-error"></label><label class="field"><span>时间</span><input id="entry-time" type="time" value="${entry?.time || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`}" required aria-describedby="form-error"></label></div><div class="photo-area"><img class="photo-preview" id="photo-preview" ${draft.photo ? `src="${draft.photo}"` : "hidden"} alt="这餐的照片预览"><p>照片（可选）</p><div class="inline-actions"><button type="button" class="button outline" data-editor="camera">${icon("camera")}拍一张</button><button type="button" class="button outline" data-editor="album">${icon("image")}从相册选</button><button type="button" class="button ghost" data-editor="remove-photo" ${draft.photo ? "" : "hidden"}>移除照片</button></div><input id="camera-file" type="file" accept="image/*" capture="environment" hidden><input id="album-file" type="file" accept="image/*" hidden><p class="photo-help" id="photo-help">仅保存在本机 · 最长边压缩至 1600 像素 · 单张不超过 25MB</p></div><label class="field"><span>吃了什么？ <small class="muted">有照片时可以不填</small></span><textarea id="entry-note" rows="3" maxlength="500" placeholder="比如：一碗番茄鸡蛋面，还有喜欢的水果…" aria-describedby="form-error">${esc(entry?.note || "")}</textarea></label><fieldset class="feeling-options"><legend>吃完的感受（可选）</legend>${Object.entries(
    FEELINGS,
  )
    .map(
      ([key, label]) =>
        `<button type="button" class="choice" data-feeling="${key}" aria-pressed="${key === draft.feeling}">${label}</button>`,
    )
    .join(
      "",
    )}</fieldset><p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions">${entry ? `<button class="button ghost delete-button" type="button" data-editor="delete" aria-label="删除这一餐">${icon("trash")}</button>` : ""}<button class="button outline" type="button" data-editor="close">取消</button><button class="button accent" id="save-entry" type="submit">${icon("check")}<span>保存记录</span></button></div></form>`;
  editor.showModal();
  $("#entry-note").focus({ preventScroll: true });
}
function closeEditor() {
  photoGeneration++;
  editor.close();
  draft = null;
  if (returnFocus?.isConnected) returnFocus.focus();
  else content.focus({ preventScroll: true });
}
async function tryCloseEditor() {
  if (state.busy) return;
  if (
    draft?.dirty &&
    !(await requestConfirm(
      "放弃这次修改？",
      "尚未保存的照片和文字会丢失。",
      "放弃修改",
    ))
  )
    return;
  closeEditor();
}
editor.addEventListener("cancel", (e) => {
  e.preventDefault();
  tryCloseEditor();
});
editor.addEventListener("input", (e) => {
  if (!draft) return;
  draft.dirty = true;
  e.target.removeAttribute("aria-invalid");
  if (e.target.tagName === "TEXTAREA") {
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(250, e.target.scrollHeight)}px`;
  }
});
function formError(message, field) {
  $("#form-error").textContent = message;
  if (field) {
    const target = $(field);
    target.setAttribute("aria-invalid", "true");
    target.focus();
  } else $("#form-error").scrollIntoView({ block: "nearest" });
}
function editorBusy(value) {
  state.busy = value;
  editor.querySelectorAll("button,input,textarea").forEach((el) => {
    el.disabled = value;
  });
  $("#save-entry").setAttribute("aria-busy", String(value));
  $("#save-entry span").textContent = value ? "正在保存" : "保存记录";
}
async function handleSave(e) {
  e.preventDefault();
  if (e.isComposing || state.busy || !draft || draft.processing) return;
  const entry = {
    id: draft.id,
    date: $("#entry-date").value,
    time: $("#entry-time").value,
    meal: draft.meal,
    note: $("#entry-note").value.trim(),
    feeling: draft.feeling,
    photo: draft.photo,
    updatedAt: new Date().toISOString(),
  };
  try {
    validateEntry(entry);
  } catch (error) {
    formError(
      error.message,
      !entry.date || entry.date > localDay()
        ? "#entry-date"
        : !entry.time
          ? "#entry-time"
          : "#entry-note",
    );
    return;
  }
  editorBusy(true);
  try {
    await store.saveEntry(entry, draft.entry?.updatedAt);
    state.date = entry.date;
    state.month = entry.date.slice(0, 7);
    closeEditor();
    await changed();
    (content.querySelector(`[data-edit="${entry.id}"]`) || content).focus({
      preventScroll: true,
    });
    notify("这一餐，记好啦。");
  } catch (error) {
    formError(`未能保存：${error.message}。内容已保留，请重试。`);
  } finally {
    state.busy = false;
    if (editor.open) editorBusy(false);
  }
}
editor.addEventListener("submit", handleSave);
editor.addEventListener("keydown", (e) => {
  if (e.isComposing && e.key === "Enter") e.preventDefault();
});
editor.addEventListener("click", async (e) => {
  const target = e.target.closest("button");
  if (!target || !draft || state.busy) return;
  if (target.dataset.meal) {
    draft.meal = target.dataset.meal;
    draft.dirty = true;
    editor
      .querySelectorAll("[data-meal]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === target)));
  } else if (target.dataset.feeling) {
    draft.feeling =
      draft.feeling === target.dataset.feeling ? "" : target.dataset.feeling;
    draft.dirty = true;
    editor
      .querySelectorAll("[data-feeling]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.feeling === draft.feeling),
        ),
      );
  } else {
    switch (target.dataset.editor) {
      case "close":
        await tryCloseEditor();
        break;
      case "camera":
        $("#camera-file").click();
        break;
      case "album":
        $("#album-file").click();
        break;
      case "remove-photo":
        photoGeneration++;
        draft.photo = "";
        draft.dirty = true;
        $("#photo-preview").hidden = true;
        $("#photo-preview").removeAttribute("src");
        target.hidden = true;
        break;
      case "delete": {
        const entry = draft.entry;
        if (
          !(await requestConfirm(
            "删除这一餐？",
            `${entry.date} ${MEALS[entry.meal]}的照片和文字将从本机删除，此操作无法撤销。`,
          ))
        )
          return;
        editorBusy(true);
        try {
          await store.deleteEntry(entry.id, entry.updatedAt);
          closeEditor();
          await changed();
          (
            content.querySelector(`[data-add="${entry.meal}"]`) || content
          ).focus({
            preventScroll: true,
          });
          notify("这条记录已删除");
        } catch (error) {
          formError(`未能删除：${error.message}`);
        } finally {
          state.busy = false;
          if (editor.open) editorBusy(false);
        }
        break;
      }
    }
  }
});
async function compressPhoto(file) {
  if (file.size > 25 * 1024 * 1024)
    throw Error("照片超过 25MB，请选择较小的图片");
  if (!file.type.startsWith("image/")) throw Error("请选择图片文件");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw Error("无法读取这张照片");
    }
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 80000000
    )
      throw Error("照片尺寸过大，请先缩小");
    const scale = Math.min(
        1,
        1600 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("浏览器暂时无法处理图片");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
editor.addEventListener("change", async (e) => {
  if (e.target.type !== "file" || !draft) return;
  const file = e.target.files[0];
  if (!file) return;
  const generation = ++photoGeneration;
  draft.processing = true;
  draft.dirty = true;
  editor
    .querySelectorAll(
      '[data-editor="camera"],[data-editor="album"],[data-editor="remove-photo"]',
    )
    .forEach((b) => (b.disabled = true));
  $("#save-entry").disabled = true;
  $("#photo-help").textContent = "正在处理照片…";
  try {
    const photo = await compressPhoto(file);
    if (generation !== photoGeneration || !draft) return;
    draft.photo = photo;
    draft.dirty = true;
    $("#photo-preview").src = photo;
    $("#photo-preview").hidden = false;
    editor.querySelector('[data-editor="remove-photo"]').hidden = false;
    $("#form-error").textContent = "";
    $("#photo-help").textContent = "照片已准备好，保存后留在本机。";
  } catch (error) {
    if (generation === photoGeneration && draft) {
      formError(
        `${error.message || "无法读取照片"}。可换一张图片，或转成 JPEG 后重试。`,
      );
      $("#photo-help").textContent = "照片未替换，文字内容已保留。";
    }
  } finally {
    if (generation === photoGeneration && draft) {
      draft.processing = false;
      editor
        .querySelectorAll(
          '[data-editor="camera"],[data-editor="album"],[data-editor="remove-photo"]',
        )
        .forEach((b) => (b.disabled = false));
      $("#save-entry").disabled = false;
      e.target.value = "";
    }
  }
});
async function exportData() {
  if (state.busy) return;
  const status = $("#backup-status");
  state.busy = true;
  content
    .querySelectorAll('[data-action="export"],[data-action="import"]')
    .forEach((b) => (b.disabled = true));
  status.textContent = "正在准备备份…";
  try {
    const data = await store.readAll(),
      parts = splitBackups(data.entries, data.trainingDays);
    backupUrls.forEach((url) => URL.revokeObjectURL(url));
    backupUrls = [];
    const files = $("#backup-files");
    files.replaceChildren();
    for (let i = 0; i < parts.length; i++) {
      const blob = new Blob([JSON.stringify(parts[i])], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      backupUrls.push(url);
      a.href = url;
      a.download =
        "meal-journal-" +
        localDay() +
        (parts.length > 1 ? "-part-" + (i + 1) : "") +
        ".backup.json";
      a.className = "button outline";
      a.textContent =
        parts.length > 1
          ? "下载第 " + (i + 1) + " / " + parts.length + " 份"
          : "重新下载备份";
      files.append(a);
      if (parts.length === 1) a.click();
    }
    status.textContent =
      parts.length > 1
        ? "已分成 " +
          parts.length +
          " 份备份，请逐一下载全部文件；恢复时逐份导入。"
        : "已发起下载：" + data.entries.length + " 条记录。请确认备份已保存。";
    notify(
      parts.length > 1
        ? "备份已分份，请下载全部文件"
        : "备份已准备好，请保存下载文件",
    );
  } catch (error) {
    if (status.isConnected)
      status.textContent = "导出失败：" + error.message + "。请重试。";
  } finally {
    state.busy = false;
    content
      .querySelectorAll('[data-action="export"],[data-action="import"]')
      .forEach((b) => (b.disabled = false));
  }
}
content.addEventListener("change", async (e) => {
  if (e.target.id !== "backup-file" || state.busy) return;
  const file = e.target.files[0],
    status = $("#backup-status");
  if (!file) return;
  try {
    if (file.size > 250 * 1024 * 1024)
      throw Error("备份超过 250MB，请选择较小的备份");
    const data = validateBackup(JSON.parse(await file.text()));
    if (
      !(await requestConfirm(
        "合并这份备份？",
        `备份含 ${data.entries.length} 条记录。相同编号保留本机版本，其余记录会添加到手帐。`,
        "合并导入",
        false,
      ))
    )
      return;
    state.busy = true;
    status.textContent = "正在合并备份，请稍候…";
    content
      .querySelectorAll('[data-action="import"],[data-action="export"]')
      .forEach((b) => (b.disabled = true));
    const added = await store.importBackup(data);
    await changed();
    $("#backup-status").textContent =
      `已导入 ${added} 条新记录，已有记录保持不变。`;
    notify(`备份已合并，新增 ${added} 条记录`);
  } catch (error) {
    if (status.isConnected)
      status.textContent = `未能导入：${error.message}。已有记录未受影响，请选择正确的餐记备份。`;
  } finally {
    state.busy = false;
    e.target.value = "";
    content
      .querySelectorAll('[data-action="import"],[data-action="export"]')
      .forEach((b) => (b.disabled = false));
  }
});
content.addEventListener("click", async (e) => {
  const target = e.target.closest("button");
  if (!target || state.busy) return;
  if (target.dataset.add) {
    openEditor(target.dataset.add);
    return;
  }
  if (target.dataset.edit) {
    const entry = state.entries.find((item) => item.id === target.dataset.edit);
    if (entry) openEditor(entry.meal, entry);
    return;
  }
  if (target.dataset.date) {
    state.date = target.dataset.date;
    render();
    content
      .querySelector(`[data-date="${state.date}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
  const action = target.dataset.action;
  switch (action) {
    case "today":
      state.date = localDay();
      state.month = state.date.slice(0, 7);
      if (currentView() === "today") render();
      else location.hash = "today";
      break;
    case "add":
      openEditor();
      break;
    case "week-prev":
    case "week-next":
      state.date = shiftDay(state.date, action === "week-prev" ? -7 : 7);
      if (state.date > localDay()) state.date = localDay();
      render();
      break;
    case "month-prev":
    case "month-next": {
      const date = new Date(`${state.month}-01T12:00:00`);
      date.setMonth(date.getMonth() + (action === "month-prev" ? -1 : 1));
      if (date.getFullYear() < 2000) return;
      state.month = localDay(date).slice(0, 7);
      state.date =
        state.month === localDay().slice(0, 7)
          ? localDay()
          : `${state.month}-01`;
      render();
      break;
    }
    case "retry":
      state.error = "";
      content.innerHTML =
        '<div class="loading" role="status">正在重新打开…</div>';
      await load();
      break;
    case "export":
      await exportData();
      break;
    case "import":
      $("#backup-file").click();
      break;
  }
});
window.addEventListener("hashchange", () => {
  render();
  content.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
window.addEventListener("beforeunload", (e) => {
  if (draft?.dirty || state.busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});
channel?.addEventListener("message", () => load());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.ready) load();
});
await load();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then(async (registration) => {
      const worker =
        registration.active || registration.installing || registration.waiting;
      if (worker?.state === "activated") checkCache();
      worker?.addEventListener("statechange", () => {
        if (worker.state === "activated") checkCache();
      });
    })
    .catch(() => {
      const status = $("#offline-state span");
      if (status) status.textContent = "离线资源未准备好，请联网刷新后重试";
    });
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data === "cache-ready") {
      cacheReady = true;
      const status = $("#offline-state span");
      if (status) status.textContent = offlineStatus();
    }
  });
}
function checkCache() {
  navigator.serviceWorker.ready.then((reg) =>
    reg.active?.postMessage("cache-status"),
  );
}
