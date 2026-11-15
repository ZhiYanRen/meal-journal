# 餐记交互契约

## Canonical UI Map

| Capability | Canonical owner                         | Source of truth | Allowed variants                            | Verification   |
| ---------- | --------------------------------------- | --------------- | ------------------------------------------- | -------------- |
| Date       | domain.js / app.js dateStrip & calendar | 本文件          | 原生日期/时间用于编辑，自有中文日历用于回看 | unit + browser |
| Form       | openEditor / handleSave                 | 本文件          | 新建、编辑                                  | CRUD、错误保留 |
| Scrollbar  | styles.css 全局基线                     | DESIGN.md       | forced-colors                               | computed style |
| Toast      | notify                                  | 本文件          | status/error                                | live region    |
| CRUD       | store.js / openEditor                   | 本文件          | 原子保存、删除确认                          | browser        |
| Modal      | dialog #editor 与 #confirmation         | 本文件          | editor、discard、delete、import             | keyboard/focus |

导航 today/calendar/settings 使用 hash，日期和照片内容不写 URL，防止个人日记信息被共享；切换导航保留选定日期与月份。浏览器返回有效，未知 hash 提供返回今日入口。document.title 跟随页面。记录按本地日期与时间归档，不用 UTC 日期切分。

照片压缩前验证格式、大小，处理失败留在弹窗内，支持重新选择。保存等待 IndexedDB transaction complete 后反馈，失败不关闭表单，不向用户假装保存成功。两次提交禁用；编辑携带 updatedAt，多标签冲突拒绝覆盖并提示重新打开。BroadcastChannel 通知其他标签更新，不覆盖当前打开表单。

编辑是唯一详情入口；删除/放弃修改/导入使用应用确认弹窗，Escape 等同取消，返回焦点。默认焦点放在安全取消动作。保存成功关闭弹窗并恢复上下文；取消恢复触发元素。日期与备注有文本验证、aria-invalid/describedby，备注最大500字，不使用浏览器验证泡泡。

首次真实日记为空，餐次卡片使用原创装饰插画，不写入示例记录或伪造打卡统计。照片与文字至少一项；日期不得晚于本机今天。连续天数按至少一条记录计算；今天未记录时允许从昨天开始计算。

备份 schema version=1，photo 允许空字符串或 JPEG/PNG/WebP data URL；单份导入限制250MB/5000条，校验所有条目后一次事务合并，已存在 id 保留本地内容，旧版训练日元数据取并集（本版不提供训练日界面）。导出含全部照片，超过100MB或5000条时分份，每份均可单独导入。提供逐份下载链接，恢复时导入全部分份。没有账户和网络照片传输。

数据存储不可用展示错误和重试；不降级为静默临时保存。离线缓存只缓存公开应用静态壳和品牌图标，不含用户照片；首次联网成功加载后可离线记录，hash导航刷新也有效。IndexedDB 原子事务保护保存与导入，导出应定期执行。原生日期/时间/文件弹窗由操作系统决定样式与语言，接受不同平台显示差异。处理照片期间禁用替换/移除，取消可放弃处理；异步结果只应用到发起时的表单。
