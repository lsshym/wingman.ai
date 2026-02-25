# 初始化记忆库

**系统角色**: 脚手架工具。
**任务**: 严格根据变量创建文件。禁止生成任何对话文本。

---

## 步骤 0: 配置
解析命令。
如果输入 "/init <name>"，则 TAG="<name>"。
如果输入 "/init"，则 TAG=""。

如果 TAG != "":
  MEM_DIR = ".cursor/memory-" + TAG
  RULE = ".cursor/rules/memory-" + TAG + ".mdc"
否则:
  MEM_DIR = ".cursor/memory"
  RULE = ".cursor/rules/memory-bank.mdc"

---

## 步骤 1: .gitignore
如果 TAG != ""，确保 .gitignore 存在并追加：
'''gitignore
{MEM_DIR}/
{RULE}
'''

---

## 步骤 2: 目录
确保以下目录存在:
- .cursor/rules/
- .cursor/skills/memory-manager/
- {MEM_DIR}

---

## 步骤 3: 驱动规则
**文件**: {RULE}
**内容**:
'''markdown
---
description: 记忆库驱动
globs: **/*
alwaysApply: true
---
# 记忆库驱动

1. 读取: 每次会话开始时，读取 {MEM_DIR}/activeContext.md。
2. 强制执行: 严格遵循 activeContext.md 中的架构约束。
3. 自动更新: 当一个重要任务或代码编写步骤完成时，你必须**自动**触发 Memory Manager 技能来更新文档。不要等待用户要求。
4. 手动阻断: 如果用户明确说了 "不更新", "skip", "跳过记录"，则**绝对不要**触发更新技能。
'''

---

## 步骤 4: 项目概况
**文件**: {MEM_DIR}/projectBrief.md
**内容**:
'''markdown
# 项目概况

## 核心技术栈
- 前端框架: 
- 语言: 
- 样式方案: 

## 核心规范
- 命名: 组件使用 PascalCase，函数使用 camelCase。
- 严禁事项: 禁用 any 类型；禁用行内样式。
'''

---

## 步骤 5: 当前上下文
**文件**: {MEM_DIR}/activeContext.md
**内容**:
'''markdown
# 核心记忆与约束

## 强制规范
- [架构]: 遵循现有目录结构。

## 当前进度
- [状态]: 初始化完成。

## 待办事项
'''

---

## 步骤 6: 记忆技能
**文件**: .cursor/skills/memory-manager/SKILL.md
**内容**:
'''markdown
---
description: 自动/手动更新记忆
---
# Memory Manager 技能

触发条件: 任务结束时由 Driver Rule 自动触发，或用户输入 "记录一下" 等手动触发。

执行步骤:
1. 分析最近的更改。
2. 打开 {MEM_DIR}/activeContext.md。
3. 定向更新:
   - 规范: 在 下方追加新规范。
   - 状态: 将 下方的文本完全替换为当前进度总结。
   - 想法: 在 下方追加。
4. 禁止全文重写。仅编辑标记的区域。
5. 回复: "记忆已自动更新。"
'''

---

## 步骤 7: 结束
精确输出: "已初始化 (开启自动更新)。"
