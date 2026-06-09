# Minecraft Translation  - Agent Instructions

## Project Goal

Minecraft Localization Studio is NOT a simple translation tool.

The primary goal is:

1. Scan Minecraft content
2. Discover translatable text
3. Replace text with translation keys
4. Generate language resource packs
5. Support manual translation workflow

AI translation is optional and not part of the core architecture.

---

# Localization Strategy

The system should NOT directly replace original texts with translated texts.

Instead:

Original:

```json
{
  "text": "Welcome Adventurer"
}
```

Becomes:

```json
{
  "translate": "mls.function.adventure.start.001"
}
```

Language file:

```json
{
  "mls.function.adventure.start.001": "Welcome Adventurer"
}
```

Translated language pack:

```json
{
  "mls.function.adventure.start.001": "欢迎来到冒险世界"
}
```

This allows:

* multiple languages
* easy maintenance
* incremental updates
* Minecraft-native localization

---

# Category

- Resources
  - pack list (select to scan)
    - 
      - lang
      - mcmeta
- saves
  - list (select to scan)
    - 
      - region
      - entities
      - players / playerdata
      - data
      - structures
      - level.dat
      - datapack
      - dimansions / DIM1 DIM-1...

# Architecture Principle

Scanner discovers text.

Scanner does NOT understand Minecraft semantics.

Classification is a separate layer.

---

# Processing Pipeline

```text
Import
 ↓
Scan
 ↓
Extract
 ↓
Generate Translation Keys
 ↓
Workspace
 ↓
Translate
 ↓
Build
 ↓
Language Resource Pack
```

---

# Key Generation Rules

Keys must be human-readable.

Bad:

```text
mls.000001
```

Good:

```text
mls.function.start.001

mls.book.castle.001

mls.sign.spawn.001
```

Prefer:

```text
mls.<source>.<path>.<index>
```

Examples:

```text
mls.function.adventure.start.001

mls.structure.castle.book.001

mls.world.sign.spawn.001
```

---

# Stability Requirement

Translation keys must remain stable across rescans.

The same text location should generate the same key.

Keys should be derived from:

* source file
* source path
* local index

Never generate random IDs.

---

# Universal Translation Model

All extracted content must become TranslationEntry.

```ts
interface TranslationEntry {
    id: string

    key: string

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

# Plugin Architecture

Every format must be implemented as a plugin.

Examples:

* LangExtractor
* McmetaExtractor
* FunctionExtractor
* NBTExtractor
* MCAExtractor

Register extractors via ExtractorRegistry.

Avoid giant switch statements.

---

# UI Rules

UI must never parse Minecraft files.

UI only consumes TranslationEntry.

---

# Performance Rules

Support:

* 100000+ entries
* large worlds
* large modpacks

Use:

* virtualized lists
* lazy loading
* pagination

Avoid loading everything into memory.

---

# Preferred Stack

Frontend:

* React
* TypeScript
* Vite
* Tailwind
* shadcn/ui

Backend:

* Node.js
* TypeScript

Storage:

* SQLite

Minecraft:

* prismarine-nbt
* minecraft-data

---

# First Milestone

Implement:

1. TranslationEntry
2. ExtractorRegistry
3. LangExtractor
4. McmetaExtractor
5. Key Generator
6. Workspace
7. Resource Pack Builder

Focus on architecture first.

Do not implement AI translation before extraction and build systems are complete.
