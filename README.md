# 🧰 AI Playbook for Cursor (Command Collection)

> **Modular | Independent | Surgical**
>
> 这是一套为 Cursor 打造的**独立指令集与系统规则库**。
> 它将 AI 从“闲聊助手”转变为“遵循严格协议的系统架构师”。你可以通过特定的指令（Commands）精确调度 AI 完成重构、API 联调、组件资产注册等复杂任务。

## ⚙️ 系统核心 (System Core)
本 Playbook 底层植入了强制性的 `SYSTEM CORE` 和 `HIERARCHY PROTOCOL` 设定：
- **Surgical Architect**：AI 强制处于“外科手术式”编程模式，拒绝废话，拒绝冗余生成。
- **Diffs Only & Lazy Coding**：极简输出策略，强制使用 `// ... existing code ...` 缩略未更改的代码。

---

## 🛠 独立指令模块 (Command Modules)
在 Cursor Chat 中，输入以下指令即可精准触发对应的 AI 专家工作流：

### 1. 代码重构工具 (Refactor)
当你接手“屎山”代码或需要优化复杂组件逻辑时使用。
* **`/refactor`**：**交互式逻辑重构 (Table Mode V4)**。AI 不会盲目改代码，而是先输出一张诊断表（识别属性爆炸、解构混乱、嵌套过深等 Code Smells），确认后再执行。
* **`/refactor-types`**：**交互式类型重构 (Table Mode V5)**。智能嗅探路径，分离 TypeScript 类型与业务逻辑，解决 `any` 泛滥和命名冲突问题。

### 2. 接口与数据流 (Data Integration)
* **`/api-bind`**：**自适应 API 集成协议**。拿着后端接口数据，智能映射到前端 UI 组件。自动处理 `snake_case` 到 `camelCase` 转换，并在检测到结构冲突时主动提出多态重构方案。
* **`/zod-gen`**：**Zod Schema 生成器**。丢入一段 JSON，自动生成严格的 Zod 校验层，包含字段重命名与类型推导。

### 3. 组件资产大脑 (Component Brain) ✨ *NEW*
告别重复造轮子，让 AI 帮你管理项目里的公共组件和工具函数。
* **`/reg [目标路径]`**：**注册组件**。AI 会精准提取该组件的核心接口、标签和功能描述，并严格去重后将其录入到 `.cursor/brain/` 对应的资产清单中。
* **`/find [需求描述]`**：**匹配组件**。根据需求，让 AI 智能检索 `ui-components`, `business-components` 或 `utils`，并输出最高匹配度的复用建议和调用示例。

---

## 🧠 记忆增强模块 (Memory Bank v2.0)
赋予 AI 跨会话的记忆能力，不再像鱼一样只有 7 秒记忆。目前已升级为结合 Cursor 技能（Skills）驱动的 V2.0 架构。

* **`/init [tag]`**：**初始化记忆库**。自动在 `.cursor/` 下生成包含 `activeContext.md` (当前进度)、`projectBrief.md` (全局大脑) 和防御性拦截规则的文件结构。
* **`/memo [指令]`**：**智能记忆同步**。当你完成一项有价值的代码变更时使用。AI 会通过严格的格式检查表（Checklist），将核心交互、数据流或架构约束以高维度的视角记录进 `activeContext.md`。

---

## 📄 License
MIT License © 2026 keni
