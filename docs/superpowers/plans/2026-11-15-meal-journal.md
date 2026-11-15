# 餐记 Implementation Plan

**Goal:** 完成可静态发布的每日三餐打卡 App；用户已明确授权自行决定、直接开发。
**Architecture:** 原生 HTML/CSS/ES modules，IndexedDB 保留个人照片与文字；相对路径与 hash 导航适配 Pages。复用现有 domain.js 与 store.js。
**Tech Stack:** 浏览器标准能力；Playwright 与 sharp 仅用于开发验证及图标构建。
**Spec:** 项目 DESIGN.md、UX-CONTRACT.md、AGENTS.md。

## Global Constraints

main 开发，不创建分支或 worktree；只部署 dist/；无后端及远程个人数据；所有视口可触控、可键盘操作；照片或文字至少一项。

## Tasks

- [ ] domain.js：先验证纯文字、空内容、未来日期边界；保留备份与日期现有测试。
- [ ] app.js / index.html / styles.css：今日三餐、编辑新增删除、日历、真实统计、设置备份；共享表单、确认与状态反馈。
- [ ] build.mjs / serve.mjs / sw.js / manifest：生成品牌 PNG、离线静态壳、Pages 子路径；运行构建与本地预览。
- [ ] tests/browser.mjs：文字与照片 CRUD、刷新持久化、导入导出、错误恢复、跨标签冲突、键盘、多视口、离线及减少动态。
- [ ] Pages 工作流与独立 public 仓库；检查提交内容、推送 main、跟进 CI 并线上检查；应用岛更新为真实发布地址并跟进其部署。

## Review Focus

照片解码失败须保留文字；存储失败不能关闭表单；重复打卡按不同餐次算三餐进度；导入必须先全量校验；删除/关闭时避免丢失输入。
