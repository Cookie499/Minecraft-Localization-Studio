# 简易运行与测试

## 双击启动

双击项目根目录中的 `run-app.bat`。

脚本会：

1. 检查 Node.js。
2. 首次运行时执行 `npm install`。
3. 启动本地开发服务器。
4. 自动打开 `http://localhost:5173/`。

运行期间不要关闭命令行窗口。按 `Ctrl+C` 停止服务。

不能直接双击 `index.html`：项目使用 Vite、Web Worker 和 IndexedDB，需要通过本地 HTTP 服务运行。

## 双击自动测试

双击 `run-tests.bat`。

脚本会依次运行：

```text
npm.cmd test
npm.cmd run build
```

看到 `ALL TESTS AND BUILD CHECKS PASSED` 表示自动测试通过。

## 手动测试 Lang

1. 双击 `run-app.bat`。
2. 导入包含 `pack.mcmeta` 和 `assets/<namespace>/lang/en_us.json` 的资源包。
3. 勾选资源包。
4. 启用对应 namespace 的 Language translation plan。
5. Source 选择 `en_us`，Target 输入 `zh_cn`。
6. 开始扫描并修改列表中的译文。
7. 点击 `Build ZIP`。
8. 检查 ZIP 中是否生成或更新 `assets/<namespace>/lang/zh_cn.json`。
9. 确认 `en_us.json` 未被修改。

## 手动测试 MCA

1. 导入包含 `level.dat` 的完整存档目录。
2. 在选择页勾选 Minecraft Save。
3. 按 `F12` 打开浏览器开发者工具并切换到 Console。
4. 开始扫描。
5. 检查以下日志：

```text
[MLS][extract] selected tree inventory
[MLS][mca] matched N MCA file(s)
[MLS][mca] <文件路径>: N translatable entries
[MLS][extract:mca]
```

`matched 0` 表示没有匹配到 `region/r.*.mca` 或 `entities/r.*.mca`。匹配到文件但条目为 0，表示文件已读取，但没有发现当前规则支持的可翻译文本。
