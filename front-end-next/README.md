# Injective Pass 前端（Next.js）开发指南

本项目为 Injective Pass 的前端应用，基于 Next.js（App Router）与 TypeScript，面向移动优先的“身份激活、社交互动、抽卡、生态导航”等场景。

## 当前完成情况

- 目录结构：已按建议创建 `src/app`、`src/components`、`src/lib`、`src/types`
- 别名：已在 `tsconfig.json` 配置 `@/* -> src/*`
- 配置与 API：
  - `src/lib/config.ts` 读取 `NEXT_PUBLIC_API_BASE_URL`
  - `src/lib/api.ts` 封装后端接口（NFC/用户/合约）
- 类型：`src/types/nfc.ts` 覆盖钱包/社交/抽卡/统计等响应类型
- 可复用组件（页面可直接调用）：
  - `NfcRegisterForm`（注册 NFC）
  - `SocialInteractionForm`（社交互动领券）
  - `DrawWithTicketsForm`（用券抽卡）
  - `DomainRegisterForm`（注册域名）
  - 统一导出：`src/components/index.ts`
- 演示路由：`/demo`（`src/app/(routes)/demo/page.tsx`）便于预览与联调
- UI 框架：未绑定（保留给页面同学自由选择 Tailwind/Chakra/AntD 等）

待办与建议：
- 新增展示组件：
  - 钱包信息卡（地址/余额/近期交易）
  - 抽卡统计面板（available/used/total/socialBonus）
  - 已互动 NFC 列表
  - 域名可用性检查表单
- 引入统一 UI 方案与主题（移动端优先）
- 加入 SWR/React Query（数据缓存与错误重试）
- WebAuthn/Passkey 适配（后端接口就绪后对接）

## 技术栈
- Next.js 14+（App Router）
- React 18 + TypeScript
- UI（自选）：Tailwind CSS/Chakra/AntD（根据团队偏好）
- 数据：原生 `fetch`/`SWR`/`React Query`（三选一）

## 目录结构（建议）
```
front-end-next/
├─ src/
│  ├─ app/                 # App Router（页面/布局/路由处理）
│  │  ├─ layout.tsx        # 全局布局
│  │  ├─ page.tsx          # 主页
│  │  └─ (routes)/...      # 其他路由分组（如 /dashboard /nfc /domain /games）
│  ├─ components/          # 复用组件（UI/表单/图表/列表）
│  ├─ lib/                 # 工具函数（api 客户端、常量、hooks）
│  ├─ styles/              # 全局样式
│  └─ types/               # TS 类型声明
├─ public/                 # 静态资源
├─ package.json
├─ tsconfig.json
├─ next.config.js          # Next 配置
└─ .env.local              # 本地环境变量（不提交）
```

## 快速开始
```bash
# 安装依赖
npm install

# 启动开发（默认 http://localhost:3000）
npm run dev

# 生产构建与启动
npm run build
npm run start
```

## 环境变量（.env.local）
```env
# 后端 API 基地址（nfc-wallet-backend）
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# 可选：前端站点 URL（用于生成回调链接/分享卡片等）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
说明：
- 以 `NEXT_PUBLIC_` 开头的变量会暴露到浏览器侧，请勿放敏感信息。
- 与后端联调时确保 CORS/代理已配置（参考后端 `nginx.conf`）。

## 与后端联调规范
- 推荐封装一个轻量 API 客户端（位于 `src/lib/api.ts`），统一处理 baseURL、错误码与重试。
- 示例（原生 fetch）：
```ts
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// 用例
export const NfcApi = {
  register: (body: { uid: string; nickname?: string }) =>
    api('/api/nfc/register', { method: 'POST', body: JSON.stringify(body) }),
  wallet: (uid: string) => api(`/api/nfc/wallet/${uid}`),
  social: (body: { myNFC: string; otherNFC: string }) =>
    api('/api/nfc/social-interaction', { method: 'POST', body: JSON.stringify(body) }),
  drawWithTickets: (body: { nfcUid: string; catName: string }) =>
    api('/api/nfc/draw-cat-with-tickets', { method: 'POST', body: JSON.stringify(body) }),
};
```
- 服务端渲染取数（在 `app/xxx/page.tsx`）：可用原生 `fetch`（SSR 默认），或在客户端组件中用 `SWR/React Query`。

## 渲染策略（SSR/SSG/ISR/CSR）
- 营销页/静态内容：SSG 或 ISR（更利 SEO 与首屏速度）。
- 仪表盘/需要实时数据：CSR（客户端组件 + SWR/React Query）或 SSR `cache: 'no-store'`。
- WebAuthn/NFC/钱包交互：CSR（仅在浏览器环境运行）。

## 模块路径别名（推荐）
在 `tsconfig.json` 中：
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```
这样可用 `@/components/Button` 替代相对路径。

## 代码规范
- ESLint + Prettier：统一风格（可用 `next lint`）
- 提交前检查（可选）：Husky + lint-staged
- 组件约定：
  - UI 组件无业务逻辑；
  - 页面下发的服务端数据通过 props 传递给客户端组件；
  - hooks 放在 `src/lib/hooks`（关注点分离）。

## WebAuthn/Passkey（预留）
- 浏览器侧：使用 WebAuthn API 注册/登录，获取 `credentialId` 与公钥；
- 服务器侧：对接后端 `/auth/webauthn/*`（上线版将新增），完成 attestation/assertion 验证；
- 建议在客户端组件中处理交互，在服务端（Route Handler）校验并颁发会话。

## NFC & 抽卡交互
- NFC 触发场景（H5/原生容器）：读取卡片 UID 后调用后端接口。
- 抽卡建议流程：先社交互动拿券 → 再 `draw-cat-with-tickets`；根据返回展示 NFT 图片与元数据。

## 多语言与 SEO（可选）
- 使用 Next Metadata API 配置站点标题/OG 卡片；
- 如需多语言，使用 `next-intl` 或 `@vercel/i18n`；
- 搜索页/推广页走 SSG/ISR，提高抓取质量。

## 构建与部署
```bash
# 生产构建
npm run build
# 启动（默认 3000）
npm run start
```
- Nginx 反向代理示例（见仓库 `nginx-frontend.conf`，按需修改域名/证书）。
- Docker（可选）：使用官方 `node:18-alpine` 构建镜像，`next build` 后运行 `next start`。

## 常见问题（FAQ）
- 访问后端 401/403：检查 Token、CORS，或后端是否要求鉴权。
- 请求跨域：优先通过 Nginx 统一域名/路径代理，避免浏览器 CORS 限制。
- 环境变量未生效：确认在 `.env.local` 中设置并重启 dev 进程；浏览器端变量需 `NEXT_PUBLIC_` 前缀。

---
如需前端模板/脚手架（含 SWR/Tailwind/别名/示例页面），我可以直接初始化并提交。
