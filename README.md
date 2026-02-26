# 🌌 Nebula Forge Pro
**Nebula Forge** 是一个基于 Tauri + React 构建的本地 AI 网页构建器。它利用 Ollama 驱动本地大模型（如 Qwen2.5-Coder），实现代码生成、实时预览与一键部署。

### ✨ 核心特性
- 🧠 **本地大脑**：完全集成 Ollama，隐私安全，零成本运行。
- ⚡ **流式生成**：极速代码输出，告别等待焦虑。
- 👁️ **实时预览**：内置沙盒环境，代码即刻变网页。
- 🚀 **一键部署**：智能复制并直达 Vercel，分钟级上线应用。
- 📏 **自适应布局**：支持侧边栏折叠与响应式工作台。

### 🚀 快速开始
1. 确保安装了 [Ollama](https://ollama.com/) 并拉取模型：`ollama pull qwen2.5-coder:7b`
2. 设置环境变量：`setx OLLAMA_ORIGINS "*"` 并重启 Ollama。
3. 安装依赖：`pnpm install`
4. 启动开发环境：`pnpm tauri dev`