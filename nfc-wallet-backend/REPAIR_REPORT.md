# Injective Pass 后端修复报告

日期: 2025-08-10
适用仓库: `nfc-wallet-backend`

## 背景
在端到端测试过程中，发现以下两个主要问题导致流程中断：
- 新用户初始资金发送失败（地址格式问题）
- 合约状态接口 404（控制器未注册）
同时，后续抽卡流程中遇到 ABI 选择不当与数据库唯一约束冲突问题。

## 问题明细与根因
- 初始资金发送失败
  - 现象: `invalid to address: decoding bech32 failed ...`，`The address is not valid`
  - 根因: 使用 Injective 银行模块（MsgSend）发送到 0x 以太坊地址（`ethAddress`），应发送到 inj bech32 地址（`address`）。
- 合约状态接口 404
  - 现象: `GET /api/contract/status` 返回 404
  - 根因: `ContractController` 定义在 `nfc.controller.ts` 中，但未在 `nfc.module.ts` 注册。
- 抽卡失败（ABI 不匹配）
  - 现象: 事件解析不稳定、后续数据入库失败概率上升
  - 根因: 载入了 `CatNFT.json` 而非实际合约 `CatNFT_SocialDraw.json`
- 数据库存储唯一冲突（P2002）
  - 现象: `Unique constraint failed on the fields: (tokenId)`
  - 根因: 从交易日志解析的 tokenId 缺失/重复时未做回退策略。

## 修复项
- 地址与初始资金
  - `src/nfc/nfc.service.ts` → `initializeNewUser`
    - 发送目标从 `user.ethAddress` 改为 `user.address`
    - 日志文案同步修正
  - `src/contract/injective.service.ts` → `sendInjectiveTokens`
    - 增加目的地址规范化: 0x → inj（`getInjectiveAddress`）
- 合约状态接口
  - `src/nfc/nfc.module.ts` 注册 `ContractController`
- 正确 ABI
  - `src/contract/injective.service.ts` 载入 `CatNFT_SocialDraw.json`
- 数据库唯一冲突处理
  - `src/nfc/nfc.service.ts` → 保存 `CatNFT` 时：
    - 使用 `mintResult.rawTx?.tokenId`；若缺失则生成唯一回退 ID
    - 捕获 `P2002`，自动追加唯一后缀重试一次

## 新增辅助脚本
- `scripts/send-initial-funds.js`
  - 用于向 inj/0x 地址发送 INJ（0x 会自动转换为 inj）
  - 用法: `CONTRACT_PRIVATE_KEY=... node scripts/send-initial-funds.js <inj_or_0x> <amount>`
- `scripts/mark-initial-funded.js`
  - 将某 UID 对应用户 `initialFunded=true` 并记录交易
  - 用法: `node scripts/mark-initial-funded.js <nfc_uid> <tx_hash> [amount]`

## 影响评估
- 向后兼容: 是。仅修复行为并增强健壮性。
- 安全性: 改善。避免向错误地址发送链上资产；入库更稳健。
- 运维: 提供脚本以便于处理偶发链上异常的补救。

## 验证结果（关键步骤）
- `GET /api/contract/status` 返回三合约可用、网络为 testnetSentry。
- 两张虚拟 NFC 注册成功；第二张初始资金失败后，经脚本补发与标记为 funded。
- 社交互动成功返回 1 张券。
- 用券抽卡在补充余额后成功，返回 `tokenId/rarity/color/txHash` 并成功入库。

## 建议后续
- 加入自动余额检测与重试队列，降低手动补发概率。
- 为 `drawCat` 操作前置余额与 `drawFee` 校验，减少链上失败成本。
- 在 `docker-compose` 中增加管理端口/脚本容器以便于日常维护操作。
