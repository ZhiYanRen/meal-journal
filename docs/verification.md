# 首版验证记录

2026-11-15。本机 Chrome 自动化模拟；没有将模拟结果视为真机验收。

- `npm run check`：通过。
- `npm test`：9项通过，覆盖本地日期、重复餐次计数、文字/照片边界、未来日期拒绝、连续天数、备份校验与分份恢复。
- `npm run build`：通过，仅生成dist/静态资源；图标由原创SVG生成。
- `npm run test:browser`：通过。覆盖文字/照片CRUD、刷新持久化、空内容校验、损坏图片、照片处理中取消、存储空间不足重试、存储被拒绝后恢复、备份导出/重复合并/错误拒绝/空白浏览器恢复、多标签页冲突、删除/放弃确认与Escape、保存后键盘焦点、减少动态效果、离线导航刷新与离线保存。
- 代表视口：iPad横屏1180×820、竖屏820×1180、手机390×844、手机横屏844×390、PC1440×1000、窄屏320×740。验证今日、日历、设置无横向溢出，表单保存操作可滚动到达。截图保留于本机work/，不提交模拟日记数据。
- 独立代码检查提出照片处理竞态及导出文件超导入限制问题；已修复并复查通过。

## 静态设计工具

执行Premium `audit_project.py --mode strict`，原始报告为项目根premium-audit.json。工具报告6条`affordance.actionless-button`；逐项核对均为现有事件代理按钮（data-action/data-editor/data-meal/data-feeling）。该扫描器仅识别模板中的onclick/@click或表单submit，不识别addEventListener与dataset分发，故本项目不宣称静态扫描零报错。真实动作由app.js的content/editor click监听器处理，浏览器流程验证对应操作；没有添加无效onclick来规避扫描。

DESIGN.md按designmd执行lint：0错误，1条border元数据未被组件引用的提示（运行时CSS实际使用该token）；运行时tokens由styles.css :root统一所有。新增界面沿用既有品牌，范围调整详见DESIGN.md实施记录。

## 未验证范围

真机Safari/WebKit、iPad主屏幕安装、系统相机与键盘、辅助技术人工验收及低性能设备未验证。超大照片库受浏览器内存及本机存储上限约束；不声称永久存储或跨设备同步。GitHub Actions首次部署成功（5cd6a75），正式网址 https://zhiyanren.github.io/meal-journal/ 的完整浏览器流程也已通过，HTML/JS/CSS/manifest/全部品牌图标均返回200。应用岛同步状态在交付时以实际发布结果为准。
