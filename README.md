# 幕语 MuYu

幕语是一个 Windows 悬浮提词器。它支持本地讲稿导入、手动滚动和背景透明度，已通过飞书整屏共享隐藏验证。讲稿与幻灯片独立操作。

## 下载与运行

当前版本为 **0.2.5**，支持 Windows 10 2004 或更新版本（x64）。便携包需要 Microsoft Edge WebView2 运行时，使用者无需安装开发工具。

1. 获取 `MuYu-0.2.5-windows-x64-portable.zip` 和 `SHA256SUMS.txt`。从源码构建时，两者位于 `dist/`。
2. 解压 `MuYu-0.2.5-windows-x64-portable.zip`，双击 `MuYu.exe`。
3. 在主界面单击「打开讲稿编辑器」并导入文件。「编辑原文」显示原始内容，「格式预览」渲染 Markdown 标题、粗体和列表等标记。DOCX 和 PDF 通过文本提取导入，效果取决于文件内容。
4. 将鼠标放在讲稿上滚动。也可以聚焦提词窗，按方向键、`Page Up`、`Page Down` 或 `Home`。要翻幻灯片时，单击演示窗口。
5. 要透过提词窗看 PPT，在「设置 → 外观 → 提词窗背景不透明度」调低百分比。`0%` 为透明，文字大小和文字不透明度可以分别调整。

初次启动使用简体中文，也可以在设置里选择其他语言。界面语言只影响界面文字和字体选用，讲稿内容会保持原文。

## 飞书整屏共享

1. 在「设置 → 隐私与系统」确认「屏幕捕获时隐藏」已开启。0.2.5 默认开启此选项。把阅读窗放在演示所在的屏幕上。
2. 在飞书共享面板选择正在放映的桌面。双屏时检查所选预览显示的是放映画面。
3. 用另一台设备加入测试会议，确认接收端仅显示演示画面，讲者实体屏幕仍可看到讲稿。单击演示窗翻页，再确认接收端跟随翻页。

2026 年 11 月 12 日，幕语 0.2.5 通过飞书整屏共享复测。讲者电脑可见幕语，手机接收端在 PPT 翻页前后都只显示幻灯片。Windows 的捕获排除效果取决于共享工具、显示设备与捕获方式。[Windows 捕获接口说明](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)

## 讲稿和设置保存位置

| 数据 | 位置 |
| --- | --- |
| 当前讲稿和应用设置 | 在资源管理器地址栏输入 `%APPDATA%\org.muyu.teleprompter`，打开其中的 `state.json` |
| 讲稿库、讲稿卡模板等 | WebView2 的本机站点存储。备份讲稿时，建议保留导入原件或另存一份原文 |
| 导入的源文件 | 保留在原路径，幕语读取内容并在本机保存讲稿状态 |

TXT、Markdown 等纯文本可离线导入。PDF 和 DOCX 导入会按需从 jsDelivr 加载解析库，文件内容在本机解析。PDF 导入依赖文档已有的文字层。

## 开发与打包

安装 Node.js 24、PowerShell 7、Rust stable MSVC 工具链、Visual Studio C++ Build Tools 和 Windows SDK。[Tauri Windows 构建要求](https://v2.tauri.app/start/prerequisites/)

```powershell
npm ci
npm test
npm run tauri -- dev
npm run dist
```

打包脚本生成 `dist/` 下的便携目录、ZIP 和 `SHA256SUMS.txt`。可用 `Get-FileHash -Algorithm SHA256 <ZIP 路径>` 检查下载的 ZIP。GitHub Actions 使用相同的命令生成工作流产物，正式发布步骤见[贡献指南](CONTRIBUTING.md)。

## 测试与复现

- [tests/](tests/) 保存 `npm test` 使用的回归测试。
- [validation/fixtures/](validation/fixtures/) 提供合成讲稿（TXT、Markdown）。可搭配任意两页以上的测试幻灯片，复现导入、滚动、翻页和共享隐藏。
- 本机验收记录保存在 `validation/RESULTS.md`，由 Git 忽略。公开兼容性结果记录在本 README。

## 许可证和上游

幕语基于 Waled Alturkmani 的 Flow V2.0.0，按 GPL-3.0-or-later 分发。代码来源、改动和依赖见[第三方声明](THIRD_PARTY_NOTICES.md)、[许可证](LICENSE)和[更新日志](CHANGELOG.md)。幕语是独立项目，飞书、PowerPoint 等名称用于说明使用场景。
