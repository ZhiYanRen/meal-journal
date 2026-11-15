# 餐记 · 把每一餐，记成好习惯

每日三餐饮食打卡 App。照片或文字均可记录早餐、午餐、晚餐与加餐，支持可选饱腹感、补记、编辑删除、日历回看、连续记录与三餐进度。iPad 侧栏布局，手机底部导航，电脑也可使用。

## 使用与数据

无需账号；饮食照片和文字保存在当前浏览器的 IndexedDB，不上传、不自动跨设备同步。首次联网加载并完成离线资源准备后，可离线打开与记录。可用 Safari 添加到 iPad/iPhone 主屏幕。

在「我的手帐」导出备份；导入为原子合并，相同编号保留本机版本。大备份自动分份，必须下载所有文件，恢复时逐份导入。清理浏览器数据、更换设备或卸载浏览器前务必备份。备份含私人照片，请妥善保管，勿放进公开仓库。

## 开发与验证

Node.js 22.16+（CI 为 Node 24），`npm ci` 安装开发依赖，无生产运行依赖。

```sh
npm run check
npm test
npm run build
npm run test:browser
PORT=0 npm start
```

预览地址由启动输出给出，包含 `/meal-journal/` 子路径。默认端口4175；`PORT=0` 自动选择空闲端口。浏览器测试也使用独立空闲端口。macOS 默认本机 Chrome，可用 `BROWSER_EXECUTABLE` 指定；其他系统先 `npx playwright install --with-deps chromium`。`TEST_URL` 可指定线上测试目标，测试仅使用浏览器隔离会话中的合成数据，不修改仓库。

## 发布

唯一公开仓库：https://github.com/ZhiYanRen/meal-journal 。主干 `main`，工作流 `.github/workflows/pages.yml`；Pages Source 为 GitHub Actions。推送后验证逻辑、构建、运行浏览器流程，再仅上传 `dist/` 并发布本仓库 Pages。支持 `workflow_dispatch`；PR 只验证不发布。无发布密钥或外部服务器。

正式网站：https://zhiyanren.github.io/meal-journal/ （已部署并通过线上浏览器验证）。导航登记：应用岛 `app-island/public/projects.json`，正式网站核验后同步启用。

## 边界

- 不估算热量、不做营养评价或自动识别食物，不提供云同步。
- 单条一张照片，单餐可多条；压缩最长边1600像素的JPEG，不保留原图。单张文件不超过25MB；HEIC不可读取时需转JPEG/PNG。
- 单份导入上限250MB和5000条；导出按100MB或5000条分份。当前本机全部数据会读取到内存，超大照片库仍受浏览器内存及存储空间限制。
- 存储失败保留表单，支持重试；多标签编辑冲突拒绝覆盖。数据保存在浏览器内，不等于永久存档，请定期导出。
- 浏览器自动化覆盖 iPad 横竖屏、手机横竖屏、320px窄屏和PC；真机相机、Safari主屏幕安装、系统键盘与低性能设备未验证。

视觉约定见 DESIGN.md，交互约定见 UX-CONTRACT.md，资源来源见 ASSETS.md。
