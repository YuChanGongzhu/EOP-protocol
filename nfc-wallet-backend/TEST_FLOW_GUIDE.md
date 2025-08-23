# Injective Pass 后端手工测试流程指南（CLI）

日期: 2025-08-10
Base URL: `http://localhost:8080`

## 1. 预检查
- 合约状态
  - `curl -s http://localhost:8080/api/contract/status | jq`
  - 期望: `nfcRegistry/domainNFT/catNFT` 为 true，网络为 testnetSentry
- 服务健康
  - `curl -s http://localhost:8080/api/nfc/stats | jq`

## 2. 注册两张 NFC（虚拟 UID 示例）
- 注册 #1
```
curl -s -X POST http://localhost:8080/api/nfc/register \
  -H 'Content-Type: application/json' \
  -d '{"uid":"04:aa:bb:cc:dd:ee:ff","nickname":"我的主卡"}' | jq
```
- 注册 #2
```
curl -s -X POST http://localhost:8080/api/nfc/register \
  -H 'Content-Type: application/json' \
  -d '{"uid":"04:11:22:33:44:55:66","nickname":"我的第二张卡"}' | jq
```
- 查询钱包
```
curl -s http://localhost:8080/api/nfc/wallet/04:aa:bb:cc:dd:ee:ff | jq
curl -s http://localhost:8080/api/nfc/wallet/04:11:22:33:44:55:66 | jq
```

## 3. 若 initialFunded=false 的处理
- 补发初始资金（容器外本机执行，需提供 PK）
```
CONTRACT_PRIVATE_KEY=... node nfc-wallet-backend/scripts/send-initial-funds.js <inj_or_0x> 0.1
```
- 标记数据库 funded=true（并记录交易）
```
node nfc-wallet-backend/scripts/mark-initial-funded.js <nfc_uid> <tx_hash> 0.1
```

## 4. 社交互动（换抽卡券）
```
curl -s -X POST http://localhost:8080/api/nfc/social-interaction \
  -H 'Content-Type: application/json' \
  -d '{"myNFC":"04:aa:bb:cc:dd:ee:ff","otherNFC":"04:11:22:33:44:55:66"}' | jq
```

## 5. 用券抽卡
- 余额不足时先补充余额（建议 >= 0.2 INJ）
```
CONTRACT_PRIVATE_KEY=... node nfc-wallet-backend/scripts/send-initial-funds.js <inj_address> 0.5
```
- 发起抽卡
```
curl -s -X POST http://localhost:8080/api/nfc/draw-cat-with-tickets \
  -H 'Content-Type: application/json' \
  -d '{"nfcUid":"04:aa:bb:cc:dd:ee:ff","catName":"Lucky Cat"}' | jq
```

## 6. 查询
```
# 抽卡统计与互动列表
curl -s http://localhost:8080/api/nfc/draw-stats/04:aa:bb:cc:dd:ee:ff | jq
curl -s http://localhost:8080/api/nfc/interacted-nfcs/04:aa:bb:cc:dd:ee:ff | jq

# 我的猫咪列表
curl -s http://localhost:8080/api/nfc/cat/list/04:aa:bb:cc:dd:ee:ff | jq
```

## 7. 域名（可选）
```
curl -s "http://localhost:8080/api/nfc/domain/check?domainPrefix=alice" | jq
curl -s -X POST http://localhost:8080/api/nfc/domain/register \
  -H 'Content-Type: application/json' \
  -d '{"uid":"04:aa:bb:cc:dd:ee:ff","domainPrefix":"alice"}' | jq
```

## 8. 说明与陷阱
- 初始资金：银行模块要求 inj 地址（bech32）。脚本会自动将 0x 转 inj。
- 抽卡费用：需支付 `drawFee`（默认 0.1 INJ）+ gas，余额建议 ≥0.2 INJ。
- 授权：服务会自动为用户执行 `authorizedOperator` 授权。
- DB 冲突：若链上 tokenId 缺失/重复，服务会回退为本地唯一 tokenId 并重试入库。

## 9. 完整测试日志
参见 `logs/test_20250810_injective_pass_e2e.log`