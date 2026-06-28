# ezPLM 集成指南

本文档说明如何把 Circuit Canvas 从 demo 模式切到对接真实 ezPLM 后端。

## 运行模式回顾

| 模式 | 数据来源 | 切换方式 |
|---|---|---|
| demo | 前端内存 Mock | 默认 |
| standalone | 本地后端骨架 `server/` | `VITE_APP_MODE=standalone` |
| integrated | ezPLM 真实后端 | `VITE_APP_MODE=integrated` + `VITE_API_BASE_URL` |

## 对接步骤

### 1. 配置后端地址与令牌

`.env`：
```
VITE_APP_MODE=integrated
VITE_API_BASE_URL=https://www.ezplm.cn/api
```

令牌注入（在宿主页面挂载 Circuit Canvas 前）：
```ts
import { setAuthTokenGetter } from '@/providers/factory';
// ezPLM SSO/OIDC 票据
setAuthTokenGetter(() => window.__EZPLM_TOKEN__ ?? null);
```

### 2. 实现真实接口

后端需提供以下端点（契约见 `src/providers/ezplm/contracts.ts`）：

```
GET  /v1/me
GET  /v1/components/search?keyword=&category=&orgOnly=&page=&pageSize=
GET  /v1/components/{id}
GET  /v1/components/{id}/footprints
GET  /v1/components/{id}/alternatives
GET  /v1/organizations/{orgId}/materials/{componentId}
GET  /v1/reference-designs/peripheral-circuits?category=
GET  /v1/projects/{id}/design
PUT  /v1/projects/{id}/design
```

`server/` 目录是一个可运行的参考实现（Express + 文件存储），
正式版把数据源换成 PostgreSQL + ezPLM 元器件库即可，端点契约不变。

### 3. 调整字段映射（如有差异）

ezPLM 真实接口的字段名若与 `contracts.ts` 假设的不同，
**只需修改 `src/providers/ezplm/mappers.ts`** —— Provider 实现、状态层、UI、设计内核都不用动。

例如 ezPLM 的类别字段若是中文「微控制器」，`mapCategory()` 已内置映射；
新增取值在 `CATEGORY_MAP` 里补一行即可。

### 4. 几何兜底

若 ezPLM 暂未提供封装的 courtyard 几何，`EzplmComponentDataProvider.resolveFootprintGeometry()`
会用本地几何库按封装名估算，保证画布碰撞检测与面积估算可用。
接入真实几何后自动使用真实值。

## 写回设计文档

用户保存时，前端调用 `ProjectProvider.saveDesignDocument(projectId, json)`，
对应 `PUT /v1/projects/{id}/design`。建议 ezPLM 侧：
- 作为项目附件存储（统一 `CircuitCanvasDocument` JSON）；
- 不直接覆盖正式 BOM，而是创建 BOM 草稿供评审。

## 数据流

```
ezPLM 项目页「元器件查一查、摆一摆」
   → 注入 SSO 票据 (setAuthTokenGetter)
   → EzplmIdentityProvider.getCurrentUser() 获取组织/项目上下文
   → EzplmComponentDataProvider 搜索（组织物料优先）
   → 画布预布局 + 设计审查
   → ProjectProvider.saveDesignDocument 写回项目
```
