# HIERARCHY PROTOCOL (优先级协议)
# 核心原则：项目规则 (.cursorrules/.mdc) 绝对优先 | 仅做兜底

- **Priority**: If a `.cursorrules` or `.mdc` file exists in the project root, **IT TAKES PRECEDENCE** over these global settings.
- **Fallback**: These global rules apply only when no project-specific rules contradict them.
