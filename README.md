# Circuit Canvas v3

电子产品早期架构与 PCB 预布局智能工具 — TypeScript 分层架构重构版。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:5173 (demo 模式)
npm run build    # 生产构建 → dist/
npm run test     # 内核单元测试
npm run typecheck
```

## 部署 Vercel

已含 `vercel.json`，导入仓库后零配置部署。详见 docs/ARCHITECTURE.md。

## standalone 后端骨架

```bash
cd server && npm install && npm run dev   # http://localhost:8787
# 前端设 VITE_APP_MODE=standalone, VITE_API_BASE_URL=http://localhost:8787/api
```

## 目录

```
src/
├── design-core/   设计内核（纯函数：几何/碰撞/放置/文档模型）
├── providers/     数据源抽象层（接口契约 + Mock 实现 + 工厂）
├── state/         Zustand 状态管理
├── modules/       UI 功能模块（搜索/画布/BOM/顾问）
├── config/        三种运行模式配置
├── shared/        共享主题/常量
└── App.tsx        应用壳
server/            standalone 后端骨架 (Express)
docs/              架构文档
```

架构详解见 **docs/ARCHITECTURE.md**。
