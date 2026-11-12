# 第三方声明

## Flow

Copyright (C) 2026 Waled Alturkmani (LumoRez07)。Flow 使用 GPL-3.0-or-later，完整许可随源码和便携包提供。[Flow V2.0.0 对应源码](https://github.com/LumoRez07/Flow/tree/3e9ba127cbdbfe124df861a857e1dca93256251c)

幕语基于 Flow 增加简体中文语言包、独立应用标识、Windows 便携构建和项目文档，并关闭上游更新源。0.2.0 改为手动滚动，移除声音输入和远程功能。后续移除了 AI 讲稿生成功能，并在 0.2.5 默认开启屏幕捕获排除。各版本改动和日期见 [CHANGELOG.md](CHANGELOG.md)。

0.2.5 仍沿用 Flow 的应用图标和部分界面图形。上游代码许可证与品牌标识的使用权限应分别核对。幕语源码不包含 Flow 的独立 Pro 子模块。

## 主要组件

| 组件 | 来源和许可 |
| --- | --- |
| Tauri | [Tauri](https://github.com/tauri-apps/tauri)，MIT 或 Apache-2.0。 |
| Phosphor Icons | [Phosphor Icons for Web](https://github.com/phosphor-icons/web)，MIT。 |
| PDF.js 4.10.38 | [Mozilla PDF.js](https://github.com/mozilla/pdf.js/blob/v4.10.38/LICENSE)，Apache-2.0。导入 PDF 时从 jsDelivr 加载，未打入便携包。 |
| Mammoth.js 1.9.1 | [Mammoth.js](https://github.com/mwilliamson/mammoth.js/blob/master/LICENSE)，BSD-2-Clause。导入 DOCX 时从 jsDelivr 加载，未打入便携包。 |
| Microsoft Edge WebView2 | Windows 运行依赖。使用机器上已安装的运行时，便携包未包含运行时安装程序。 |

随附许可文本位于 `licenses/`。JavaScript 和 Rust 依赖版本记录在 `package-lock.json` 与 `src-tauri/Cargo.lock`。
