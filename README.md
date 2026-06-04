# Minecraft Localization Studio

Minecraft 整合包、数据包、资源包和存档本地化工作台。

一个类似 Crowdin 的 Web 工具，用于扫描 Minecraft 项目中的可翻译文本，统一管理翻译内容，并安全写回原始文件。

---

## Features

### Text Extraction

自动扫描并提取：

* Resource Pack Lang
* Data Pack
* MCFunction
* Advancement
* Loot Table
* Structure NBT
* ItemStack
* Book
* Entity
* Block Entity
* Region (MCA)

---

### Translation Workspace

* 类似 Crowdin 的翻译界面
* 手动翻译
* 批量编辑
* 搜索与过滤
* 自动保存
* 状态管理

---

### Safe Build

* 不直接修改原文件
* 工作区独立保存
* Build 时写回
* 支持导出 ZIP

---

## Planned Features

* Translation Memory
* Glossary
* AI Translation
* FTB Quests Support
* Patchouli Support
* Mod Language Extraction

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* TailwindCSS

### Backend

* Node.js
* TypeScript

### Storage

* SQLite

### Minecraft Libraries

* prismarine-nbt
* prismarine-world
* minecraft-data

---

## Project Structure

```text
frontend/
backend/
shared/

workspace/

docs/
 ├─ PROJECT.md
 └─ TODO.md
```

---

## Development Status

Early Planning Stage

Current Focus:

* Project Architecture
* Translation Entry Model
* Scanner System
* NBT Parsing
* Workspace Design

---

## Goal

Build a complete localization platform for Minecraft projects instead of a simple machine translation tool.
