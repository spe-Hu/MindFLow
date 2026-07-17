# MindFlow 技术文档索引

本文档追踪项目中所有 ADR、SPEC 及其关联关系。

## 索引表

| 编号 | 主题 | ADR | SPEC | Issue | 状态 | 关联模块 |
|------|------|-----|------|-------|------|----------|
| OBS-001 | Obsidian 本地思维导图双向同步 | [ADR-0001](adr/0001-local-obsidian-sync.md) | [SPEC](SPEC-Obsidian-Sync.md) | [#1](https://github.com/spe-Hu/MindFLow/issues/1) | ready-for-agent | `smmMdParser`, `localWorkspaceStore`, `localFileSync`, `LocalWorkspacePanel` |

## 文档规范

- **ADR**（Architecture Decision Record）：记录不可逆的架构决策及其权衡。
- **SPEC**：从 ADR 延伸出的可执行技术规范，包含完整的用户故事、接口设计和实现计划。
- **Issue**：SPEC 与 GitHub Issues 一一对应，用于开发跟踪和 PR 关联。

## 关联规则

1. ADR header 中包含 `related-spec` 和 `related-issue` 字段
2. SPEC header 中注释包含 `Related ADR` 和 `Related Issue`
3. Issue body 中显式引用 ADR 和 SPEC 的文件链接
4. 所有关联关系在本索引表中汇总

---

*最后更新：2026-07-17*
