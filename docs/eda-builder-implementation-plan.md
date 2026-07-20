# EDA Asset Builder Implementation Plan

## 目标

在 Circuit Canvas 内嵌一个 KiCad 资产生成插件，覆盖：

- Datasheet PDF 上传；
- Datasheet PDF URL；
- ezPLM 型号；
- 缺失 Symbol / Footprint / STEP / VRML 的检查与生成；
- Evidence + Review；
- Artifact Bundle 注册到当前画布。

## 当前落地范围：Phase 1

- 新增插件注册表 `src/plugins/registry.ts`。
- 新增插件清单 `src/plugins/eda-asset-builder/manifest.ts`。
- 新增 `EdaBuilderProvider` 契约与 Mock Provider。
- 新增六步 Modal UI。
- 新增 `registerGeneratedAssetBundle()`，复用现有 KiCad 解析器和 runtime override。
- 在 `App.tsx` 与自建模块面板增加最小入口。

## 当前落地范围：Phase 2

- 新增 `services/eda-builder` FastAPI 模块化单体骨架。
- 新增本地 JSON Job/Draft/Event/Artifact Store。
- 新增 `HttpEdaBuilderProvider`。
- 新增 Express standalone proxy：`/api/v1/eda-builder/*`。
- 新增 Vercel gateway proxy：`api/v1/eda-builder/[...path].js`。
- 保持 demo 模式使用 Mock Provider，standalone/integrated 使用 HTTP Provider。
- 明确返回 `GENERATION_NOT_IMPLEMENTED`，不伪造 OCR、KiCad、STEP 生成结果。

## 后续阶段

- Phase 2：增加 `services/eda-builder` FastAPI 单体服务与 HTTP Provider。已完成骨架。
- Phase 3：接 PDF 上传、PDF URL、ds2kicad Adapter。
- Phase 4：确定性 Pin/Package 提取与 Evidence。
- Phase 5：Symbol IR 与 KiCad 9/10 serializer。
- Phase 6：Footprint Match / Generator。
- Phase 7：STEP / VRML Match / Generator。
- Phase 8：Validation。
- Phase 9：ezPLM 回写。

## 约束

- 不假设九个 Agent 已存在。
- 不在 Vercel Function 中运行 OCR、KiCad CLI 或 CAD Kernel。
- LLM 只作为结构化提取 fallback，不直接生成 KiCad 文件。
- 生成结果必须先进入 `EdaAssetDraft`，再由确定性 generator 输出。
- 未通过 Pin/Pad、Pin 1、格式验证的资产不能正式发布。
