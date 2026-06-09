# Minecraft Localization Studio

Minecraft 整合包、数据包、资源包和存档本地化工作台。

一个类似 Crowdin 的 Web 工具，用于扫描 Minecraft 项目中的可翻译文本，统一管理翻译内容，并安全写回原始文件。

---

## Quick Start

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm test         # 核心库单测
npm run build    # 生产构建
```

---

## Features

### Text Extraction

自动扫描并提取：

* Resource Pack Lang
* Data Pack（pack.mcmeta、advancement、loot table、mcfunction）
* Structure NBT
* level.dat / playerdata
* Region (MCA)

### Translation Workspace

* 类似 Crowdin 的三栏翻译界面
* 虚拟列表（大项目友好）
* 自动保存到 IndexedDB
* 状态管理（untranslated → translated → review → approved）

### Safe Build

* 不直接修改原文件
* 工作区独立保存
* Build 时写回 Lang / JSON
* 支持导出 ZIP

---

## Tech Stack

| 层 | 技术 |
|----|------|
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Core | TypeScript（`@mls/core`） |
| Storage | IndexedDB（Dexie） |
| Minecraft | prismarine-nbt, pako（MCA 解压） |

---

## Project Structure

```text
packages/
  core/          # 扫描、提取、NBT/MCA 解析、工作区、Builder
  web/           # Vite + React 前端
```

---

## Development Status

**Phase 0–1 已完成（MVP）**

- [x] Monorepo 脚手架（Vite + React + TS）
- [x] TranslationEntry 模型 + IndexedDB 工作区
- [x] 文件夹 / ZIP 导入
- [x] Lang、mcmeta、advancement、loot、mcfunction 提取
- [x] Text Component 解析
- [x] Structure NBT、level.dat、playerdata、MCA 提取
- [x] Lang JSON 写回 + ZIP 导出

---

## Goal

Build a complete localization platform for Minecraft projects instead of a simple machine translation tool.
