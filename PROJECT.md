# Minecraft Localization Studio

Minecraft 整合包 / 数据包 / 存档本地化工作台
html typescript

---

# 项目简介

Minecraft 中的可翻译文本散布在大量不同格式和文件中：

* Resource Pack
* Data Pack
* Save
* Structure
* NBT
* MCA
* Mod 文件

目前缺少能够统一提取、管理、编辑和写回这些文本的工具。

本项目目标是构建一个类似 Crowdin 的 Minecraft 本地化平台。

核心能力：

* 扫描项目
* 提取文本
* 管理翻译
* 手动编辑
* AI辅助翻译（后期）
* 写回文件
* 导出项目

---

# 核心原则

## AI不是核心

AI翻译仅作为辅助功能。

项目核心价值在于：

* 文本提取
* 文本管理
* 文本编辑
* 文件写回

即使没有 AI，也应能完整工作。

---

## 不直接修改原文件

扫描阶段只提取数据。

所有翻译保存在工作区。

只有执行 Build 时才写回文件。

---

## 大项目优先

设计目标：

* 100000+文本条目
* GB级存档
* 大型整合包

必须保证：

* 低内存占用
* 流畅操作
* 数据安全

---

# 整体流程

```text
导入项目
    ↓
扫描
    ↓
提取文本
    ↓
创建工作区
    ↓
翻译编辑
    ↓
Build
    ↓
导出
```

---

# 系统架构

```text
Scanner
    ↓
Extractor
    ↓
Workspace
    ↓
Editor
    ↓
Builder
```

---

# Scanner

负责扫描文件。

支持：

* 文件夹
* ZIP
* Resource Pack
* Data Pack
* Minecraft Save

输出统一文件树。

---

# Extractor

负责从各种文件中提取文本。

统一输出：

```ts
interface TranslationEntry {
    id: string

    original: string

    translation: string

    sourceFile: string

    sourceType: string

    sourcePath: string

    status:
        | "untranslated"
        | "translated"
        | "review"
        | "approved"
}
```

---

# Workspace

负责保存项目数据。

内容包括：

* 原文
* 翻译
* 状态
* 来源信息

工作区独立于原始文件。

---

# Editor

负责翻译管理。

支持：

* 搜索
* 过滤
* 编辑
* 批量修改

---

# Builder

负责写回文件。

支持：

* JSON
* NBT
* SNBT
* MCA

最终生成：

* 文件夹
* ZIP

---

# 第一阶段支持内容

---

## Resource Pack

### Lang

路径：

```text
assets/*/lang/*.json
```

提取：

```json
{
  "item.minecraft.diamond": "Diamond"
}
```

---

## Data Pack

### pack.mcmeta

提取：

```json
{
  "pack": {
    "description": "..."
  }
}
```

---

### Advancement

提取：

* title
* description

---

### Loot Table

提取：

* set_name
* lore

---

### Function

路径：

```text
data/*/functions/*.mcfunction
```

支持：

* tellraw
* title
* bossbar

解析：

* JSON Text Component
* SNBT中的文本

---

## Structure

支持：

```text
*.nbt
```

扫描：

* entities
* block_entities

---

# 第二阶段支持内容

---

## level.dat

提取：

* 世界名称

---

## playerdata

提取：

* 背包
* Lore
* 自定义名称
* 书籍

---

## ItemStack

提取：

* custom_name
* lore

---

## Book

提取：

* title
* pages

---

# 第三阶段支持内容

---

## Region

支持：

```text
region/*.mca
```

扫描：

* Chunk
* Entity
* BlockEntity

---

## Entity

提取：

* CustomName

---

## Block Entity

支持：

### Sign

* Text1~Text4
* front_text
* back_text

### Command Block

* CustomName
* LastOutput

### Lectern

* 书籍内容

### Beacon

### Banner

### Spawner

---

# Text Component解析

统一解析：

```json
{
  "text": "Hello"
}
```

```json
{
  "translate": "item.minecraft.diamond"
}
```

```json
[
  {
    "text": "Hello"
  }
]
```

```json
{
  "extra": []
}
```

---

# 翻译键支持

识别：

```json
{
  "translate": "item.minecraft.diamond"
}
```

建立关联：

```json
{
  "item.minecraft.diamond": "Diamond"
}
```

用于显示上下文信息。

---

# UI设计

参考 Crowdin。

---

## 左侧

分类树。

示例：

```text
Resource Pack
Data Pack
Functions
Books
Signs
Entities
```

支持折叠。

---

## 中间

文本列表。

显示：

* 原文
* 翻译
* 状态

---

## 右侧

详细信息。

显示：

* 来源文件
* 来源路径
* 类型

---

# 文本分组

支持按来源分类显示：

```text
Functions
Books
Signs
Entities
```

每个分类可折叠。

---

# 大数据优化

---

## 虚拟列表

禁止一次性渲染所有文本。

采用 Virtual Scroll。

仅渲染可见区域。

---

## 动态加载

按需加载数据。

避免一次性读取全部内容。

---

## 分页查询

大型项目通过分页获取数据。

避免浏览器卡顿。

---

# 数据保存

---

## 自动保存

编辑后自动保存。

无需手动点击保存按钮。

---

## 工作区缓存

翻译结果保存在工作区。

避免数据丢失。

---

## 崩溃恢复

项目异常关闭后能够恢复工作状态。

---

# 翻译状态

```text
UNTRANSLATED

↓

TRANSLATED

↓

REVIEW

↓

APPROVED
```

---

# 后期功能

不属于首个版本。

计划包括：

* Translation Memory
* Glossary
* AI翻译
* Mod支持
* FTB Quests支持
* Patchouli支持
* OCR图片文字识别

---

# 第一版目标

实现：

1. 项目导入
2. 文本扫描
3. 文本提取
4. 翻译编辑
5. 自动保存
6. 文件写回
7. 导出项目

优先保证稳定性与正确性，不追求 AI 和高级功能。


# Minecraft Localization Studio

一个面向 Minecraft 整合包、资源包、数据包和存档的本地化工作台。

目标并非单纯的 AI 翻译，而是构建一个完整的 Minecraft 内容提取、管理、翻译、审校、写回和导出平台。

---

# 项目目标

Minecraft 的文本内容分散在大量不同格式中：

* JSON
* NBT
* SNBT
* MCA
* MCFunction
* Resource Pack
* Data Pack
* Mod Jar
* Quest 文件
* Structure 文件

目前缺少一个能够统一管理这些内容的工具。

本项目旨在提供：

* 自动扫描 Minecraft 项目
* 自动提取可翻译文本
* 统一翻译管理界面
* 类似 Crowdin 的工作流
* 手动翻译与审校
* AI 辅助翻译
* 安全写回原文件
* 导出可直接使用的翻译版本

---

# 核心原则

## AI 不是核心功能

AI 翻译只是辅助工具。

项目核心价值在于：

* 提取
* 管理
* 定位
* 修改
* 写回

即使完全不接入 AI，本项目依然应该能够独立工作。

---

## 永不直接修改原始文件

扫描阶段仅提取数据。

所有翻译结果保存在工作区。

只有执行 Build 时才写回文件。

---

## 支持增量更新

当整合包更新后：

* 自动识别新增文本
* 自动识别删除文本
* 自动识别修改文本

尽可能保留历史翻译结果。

---

# 系统架构

```text
Scanner
    ↓
Extractor
    ↓
Workspace
    ↓
Editor
    ↓
Builder
    ↓
Export
```

---

# 模块划分

## Scanner

负责扫描文件。

支持：

* ZIP
* Folder
* Jar
* Minecraft Save

输出统一文件树。

---

## Extractor

负责提取文本。

支持：

* JSON
* NBT
* SNBT
* MCA
* Text Component

输出统一 Translation Entry。

---

## Workspace

负责存储项目数据。

包括：

* 原文
* 翻译
* 状态
* 引用关系
* 审核记录

---

## Editor

负责翻译管理。

支持：

* 搜索
* 过滤
* 批量编辑
* AI 翻译
* 审核

---

## Builder

负责写回文件。

支持：

* JSON 写回
* NBT 写回
* MCA 写回
* ZIP 打包

---

# Translation Entry 设计

```ts
interface TranslationEntry {
    id: string

    original: string

    translation: string

    sourceFile: string

    sourceType: string

    sourcePath: string

    context: string[]

    references: string[]

    tags: string[]

    status:
        | "untranslated"
        | "translated"
        | "review"
        | "approved"

    aiGenerated: boolean
}
```

---

# 支持的内容类型

---

## Resource Pack

### Lang

```text
assets/*/lang/*.json
```

提取：

```json
{
  "item.minecraft.diamond": "Diamond"
}
```

---

### Font

```text
assets/*/font/*.json
```

检测：

```json
{
  "chars": ["你好"]
}
```

---

# Data Pack

---

## pack.mcmeta

提取：

```json
{
  "pack": {
    "description": "..."
  }
}
```

支持：

* string
* Text Component

---

## Advancement

```text
data/*/advancements/*.json
```

提取：

* title
* description

---

## Loot Table

提取：

* set_name
* lore

---

## Function

```text
data/*/functions/*.mcfunction
```

支持解析：

* tellraw
* title
* bossbar
* team
* data merge

支持：

* JSON Text Component
* SNBT
* 嵌套文本

---

## Predicate

预留支持。

---

## Worldgen

预留支持。

---

# NBT 文件

支持：

```text
.nbt
.dat
.snbt
```

递归扫描所有文本内容。

---

# Text Component

统一解析：

```json
{
  "text": "Hello"
}
```

```json
{
  "translate": "item.minecraft.diamond"
}
```

```json
[
  {
    "text": "Hello"
  }
]
```

```json
{
  "extra": []
}
```

---

# Structure 文件

支持：

```text
*.nbt
```

扫描：

* entities
* block_entities
* palette

---

# 存档支持

---

## level.dat

提取：

* LevelName

---

## playerdata

提取：

* 背包
* 末影箱
* 书
* Lore
* Custom Name

---

## region

支持：

```text
*.mca
```

扫描：

* Chunk
* Entity
* BlockEntity

---

## entities

支持实体名称提取。

---

## data

支持：

* command storage
* map data

---

# Block Entity 支持

---

## Sign

支持：

* Text1~Text4
* front_text
* back_text

---

## Hanging Sign

---

## Command Block

支持：

* CustomName
* LastOutput

---

## Beacon

---

## Banner

---

## Spawner

---

## Trial Spawner

---

## Vault

---

## Lectern

书籍内容。

---

# Entity 支持

---

## CustomName

所有实体。

---

## Armor Stand

---

## Villager

---

## Display Entity

支持：

* Text Display
* Item Display

---

# ItemStack 支持

扫描：

```text
Items[]
```

提取：

* custom_name
* lore
* written_book_content
* custom_data

---

# Book 支持

---

## Written Book

提取：

* title
* pages

---

## Writable Book

提取页面内容。

---

# 翻译键系统

支持：

```json
{
  "translate": "item.minecraft.diamond"
}
```

自动关联：

```json
{
  "item.minecraft.diamond": "Diamond"
}
```

建立引用关系。

---

# 引用关系系统

显示：

* 翻译键
* 原文
* 所有引用位置

例如：

```text
item.minecraft.diamond

引用:
37处
```

---

# Workspace 格式

```text
project/
│
├─ project.json
├─ entries.json
├─ glossary.json
├─ memory.json
└─ cache/
```

---

# UI 设计

参考 Crowdin。

---

## 左侧

项目树。

```text
Resource Pack
Data Pack
Save
Mod
```

---

## 中间

原文。

```text
Welcome to the dungeon.
```

显示：

* 来源文件
* 类型
* 上下文

---

## 右侧

翻译内容。

```text
欢迎来到地下城。
```

---

## 底部

引用位置。

---

# 搜索功能

支持：

* 原文搜索
* 翻译搜索
* 文件搜索
* 标签搜索

---

# 过滤功能

支持：

* 未翻译
* 已翻译
* AI翻译
* 需审核
* 已审核

---

# 批量操作

支持：

* 批量替换
* 批量批准
* 批量翻译

---

# Glossary

术语库。

示例：

```json
{
  "Creeper": "苦力怕",
  "Enderman": "末影人"
}
```

---

# Translation Memory

自动复用历史翻译。

---

# AI 功能（后期）

支持：

* OpenAI
* Anthropic
* Gemini
* 自定义 API

功能：

* 单条翻译
* 批量翻译
* 润色
* 术语一致性检查

---

# Mod 支持规划

---

## FTB Quests

高优先级。

---

## Patchouli

高优先级。

---

## Better Questing

中优先级。

---

## HQM

中优先级。

---

## KubeJS

中优先级。

---

## Mod Jar

扫描：

```text
assets/*/lang
```

---

# Build 系统

输出：

* Folder
* Zip
* Resource Pack
* Datapack
* Save Copy

---

# 开发阶段

## Phase 1

* Workspace
* Lang
* Mcmeta
* Advancement
* Loot Table
* Function
* Structure

---

## Phase 2

* NBT
* ItemStack
* Book
* PlayerData

---

## Phase 3

* MCA
* Entity
* BlockEntity

---

## Phase 4

* Translation Memory
* Glossary
* Incremental Update

---

# 最终目标

成为 Minecraft 生态下的通用本地化平台。

不仅支持资源包翻译，也支持：

* 数据包翻译
* 整合包翻译
* 存档翻译
* 任务书翻译
* 模组文本翻译

并提供统一的提取、编辑、审校和导出流程。
