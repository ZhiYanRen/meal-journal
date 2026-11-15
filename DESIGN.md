---
version: alpha
name: 餐记
description: 用照片组成的随身饮食手帐
colors:
  primary: "#245747"
  accent: "#C7472E"
  background: "#F5F7F8"
  surface: "#FFFFFF"
  text: "#213E35"
  muted: "#63726D"
  border: "#DDE5E1"
  mint: "#E5F2E9"
  peach: "#FCEBDD"
  lavender: "#EEEAF6"
  danger: "#B52F35"
typography:
  sans:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  display:
    fontFamily: '"Avenir Next", "PingFang SC", system-ui, sans-serif'
rounded:
  DEFAULT: "16px"
  lg: "28px"
spacing:
  section-gap: "28px"
  page-max: "1440px"
components:
  button:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.surface}'
  accent-button:
    backgroundColor: '{colors.accent}'
  danger-button:
    backgroundColor: '{colors.danger}'
  card:
    textColor: '{colors.text}'
    backgroundColor: '{colors.surface}'
  muted-text:
    textColor: '{colors.muted}'
  breakfast-art:
    backgroundColor: '{colors.peach}'
  lunch-art:
    backgroundColor: '{colors.mint}'
  dinner-art:
    backgroundColor: '{colors.lavender}'
  dialog: {}
---

# 餐记 Design System

## Overview

### Creative North Star

餐桌旁的一本饮食手帐：有呼吸感的冷白底、松绿色文字、柿橙快门键。三餐是主角，照片和文字像相册上的小标签。

### Product context and register

中文个人饮食记录工具，照片或文字均可，不要求营养计算。iPad 优先、手机快速拍照、桌面整理。首版由用户授权直接制作，无需额外设计批准。不是宣传网站，无账号、云服务和 AI 识别。
建议图库搜索给出了运动活力色彩，但营销展示结构与本项目不符，采用本地 App 导航和轻量柔和配色。反参考：大宣传首屏、焦虑性的热量仪表、虚假的连续打卡数字。

### Token ownership/runtime mapping

public/styles.css 的 :root 是运行时唯一 token 源，本文件镜像并解释数值。组件只引用变量。使用系统中文字体，不依赖在线字体。app.js 的 icon()、mealCard()、openEditor()、notify() 是共享图形/卡片/表单/反馈实现。

## Colors

primary 松绿用于导航选中和正文强调，accent 柿橙只用于核心记录动作。mint/peach/lavender 区分餐次与反馈，均配深色文字。background 冷灰白，surface 白色。muted 次要文字仍需可读，danger 为删除与错误，不能只靠颜色区分。仅浅色主题，forced-colors 使用系统色。

## Typography

大标题 display 30–38px、700，正文 sans 16px/1.6，辅助 13px/1.5。数字用 tabular-nums，星期与月份均为中文。标题可折行，备注 overflow-wrap:anywhere。

## Layout

最大 1440px，桌面 216px 固定侧栏、主内容和 264px 回顾栏。小于 1100px 缩为 180px 侧栏，回顾栏放到内容下方；小于 1250px 时按可用宽度调整餐次网格；小于 680px 使用三项底部导航、单列照片和顶部拍照入口。所有主操作最小 44px。document 负责页面滚动，弹窗内部滚动，底部导航避让 safe-area，输入字号不小于 16px。日期/时间字段接受操作系统原生弹出层；自有回顾日历为本地化按钮网格。

## Elevation & Depth

卡片细边框和轻阴影，桌面照片保留 1.42:1 固定比例，手机采用侧面缩略图。modal 使用轻暗背景，不模糊正文。空卡片使用原创食物插画，不写入示例数据。

## Shapes

卡片 24px，主内容 28px，按钮 14px，餐次胶囊与日历标记圆形。图形保持简明餐盘与快门意象，不用 emoji 或框架图标。

## Components

共享 button 有 hover、active(scale .98)、focus-visible、disabled/busy；busy 保持尺寸。共享 mealCard 对实际照片提供中文 alt，纯装饰 SVG aria-hidden。dialog 使用原生 showModal 负责焦点和背景 inert，自有关闭/放弃确认。Toast 使用 role=status，严重错误同时留在表单或错误面板。文件输入分为直接拍照和相册，均可键盘触发。每次一张照片；记录可编辑、删除先确认；导入合并前确认。

### Motion

按钮反馈 140ms，卡片入场 240ms，仅 opacity/transform。餐次选中 160ms，进度圆环 300ms。不中断拍照和输入，减少动态偏好关闭动画及平滑滚动。不引入 GSAP，因为没有复杂编排。

### Brand assets

public/assets/logo.svg：原创餐盘、叶片与快门点，导航品牌与 favicon；public/assets/apple-touch-icon.png 180px、icon-192.png、icon-512.png，manifest 使用相对路径。PNG 从 SVG 构建，源码保留。餐次插画内联于 app.js 的 mealArt()，来源见 ASSETS.md，不依赖外部图像。

## Do's and Don'ts

- Do：拍照第一，备注可空，真实统计只从个人记录计算。
- Do：表单错误保留照片，导出文件包含照片，导入原子合并。
- Don't：把示例当作真实日记、上传个人照片、声称跨设备同步。
- Don't：靠动画延迟保存，或用宣传版式取代工具界面。

## 实施记录

2026-11-15：沿用既有松绿/柿橙品牌；将草稿中的“照片必填”和“健身训练”调整为通用三餐照片或文字记录，移除未实现的演示模式约定。运行时色彩保持既有 token。今日进度环与三种餐点插画为识别元素，其余界面保持克制。UI/UX Pro Max 检索得到 wellness/minimalism 建议，营销式 Hero/CTA 与本项目不符，因此采用 iPad 工具侧栏和系统中文字体。
