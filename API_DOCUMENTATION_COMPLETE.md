# Injective Pass API 完整文档

## 📋 API 概览

Injective Pass 是基于 NFC 的区块链钱包管理系统，提供 NFC 卡片绑定、域名 NFT、小猫 NFT 社交抽卡等功能。

**Base URL**: `http://localhost:8080`
**Swagger 文档**: `http://localhost:8080/api`

---

## 🏥 健康检查 API

### 1. 系统健康检查
```http
GET /health
```
**描述**: 检查系统基础健康状态
**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "nfc-wallet-backend",
  "version": "1.0.0"
}
```

### 2. API 健康检查
```http
GET /api/health
```
**描述**: 检查 API 服务健康状态
**响应**: 同上

---

## 💳 NFC 钱包管理 API

### 1. 注册 NFC 卡片
```http
POST /api/nfc/register
```
**描述**: 通过 NFC UID 注册并生成 Injective 钱包
**请求体**:
```json
{
  "uid": "04:1a:2b:3c:4d:5e:6f",
  "nickname": "我的NFC卡片"
}
```
**响应**:
```json
{
  "address": "inj1abc123...",
  "nfcCard": {
    "uid": "04:1a:2b:3c:4d:5e:6f",
    "nickname": "我的NFC卡片"
  },
  "initialFunded": true,
  "fundingTxHash": "0x123...",
  "domain": null
}
```

### 2. 获取钱包信息
```http
GET /api/nfc/wallet/{uid}
```
**描述**: 根据 NFC UID 获取钱包信息
**参数**:
- `uid`: NFC 卡片 UID

**响应**:
```json
{
  "address": "inj1abc123...",
  "nfcCard": {
    "uid": "04:1a:2b:3c:4d:5e:6f",
    "nickname": "我的NFC卡片"
  },
  "domain": "alice.inj",
  "balance": "1.5000"
}
```

### 3. 手动绑定 NFC 到合约
```http
POST /api/nfc/bind-to-contract/{uid}
```
**描述**: 手动将已注册的 NFC 绑定到 NFCWalletRegistry 合约
**响应**:
```json
{
  "success": true,
  "message": "NFC成功绑定到合约",
  "transactionHash": "0x123..."
}
```

### 4. 解绑 NFC 卡片
```http
POST /api/nfc/unbind
```
**描述**: 解绑 NFC 卡片，删除钱包记录
**请求体**:
```json
{
  "uid": "04:1a:2b:3c:4d:5e:6f"
}
```

### 5. 获取钱包统计信息
```http
GET /api/nfc/stats
```
**描述**: 获取系统中钱包的统计数据
**响应**:
```json
{
  "totalWallets": 100,
  "walletsWithDomain": 75,
  "walletsWithNFT": 80,
  "fundedWallets": 90,
  "recentRegistrations": 5
}
```

### 6. 查询钱包余额
```http
GET /api/nfc/balance/{address}
```
**描述**: 根据钱包地址查询 Injective 链上的余额信息
**参数**:
- `address`: 钱包地址（支持 Injective 地址或以太坊地址）

**响应**:
```json
{
  "inj": "100.5000",
  "usd": "2500.00"
}
```

### 7. 获取合约状态
```http
GET /api/nfc/status
```
**描述**: 获取智能合约的连接状态和网络信息
**响应**:
```json
{
  "nfcRegistry": {
    "address": "inj1contract123...",
    "connected": true
  },
  "domainNFT": {
    "address": "inj1domain123...",
    "connected": true
  },
  "catNFT": {
    "address": "inj1cat123...",
    "connected": true
  },
  "network": {
    "network": "TestnetSentry",
    "chainId": "injective-888",
    "rpcUrl": "https://testnet.sentry.grpc.injective.network:443",
    "restUrl": "https://testnet.sentry.rest.injective.network"
  }
}
```

---

## 🌐 域名管理 API

### 1. 检查域名可用性
```http
GET /api/nfc/domain/check?domainPrefix=alice
```
**描述**: 检查指定的 .inj 域名是否可用
**参数**:
- `domainPrefix`: 域名前缀（不包含 .inj 后缀）

**响应**:
```json
{
  "available": true,
  "domain": "alice.inj",
  "ownerAddress": null
}
```

### 2. 注册域名 NFT
```http
POST /api/nfc/domain/register
```
**描述**: 为 NFC 卡片注册 .inj 域名 NFT
**请求体**:
```json
{
  "uid": "04:1a:2b:3c:4d:5e:6f",
  "domainPrefix": "alice"
}
```
**响应**:
```json
{
  "domain": "alice.inj",
  "tokenId": "123",
  "txHash": "0x123...",
  "nftAddress": "inj1domain123..."
}
```

---

## 🐱 小猫 NFT 系统 API

### 1. 获取用户小猫 NFT 列表
```http
GET /api/nfc/cat/list/{uid}
```
**描述**: 根据 NFC UID 获取用户拥有的所有小猫 NFT
**响应**:
```json
{
  "cats": [
    {
      "tokenId": "1",
      "name": "Lucky Cat",
      "rarity": "SR",
      "color": "绿色",
      "mintedAt": "1640995200",
      "metadata": "ipfs://..."
    }
  ],
  "totalCount": 1
}
```

### 2. 获取 NFC 的社交统计信息
```http
GET /api/nfc/cat/social/{uid}
```
**描述**: 获取 NFC 的抽卡次数、已互动 NFC 列表和社交奖励信息
**响应**:
```json
{
  "nfcUID": "04:1a:2b:3c:4d:5e:6f",
  "availableDraws": 3,
  "totalDrawsUsed": 2,
  "interactedNFCs": ["04:2b:3c:4d:5e:6f:7a"],
  "socialRewards": {
    "rarityBonus": 1.2,
    "totalInteractions": 1
  }
}
```

### 3. 检查两个 NFC 是否已经互动过
```http
POST /api/nfc/cat/check-interaction
```
**描述**: 检查两个 NFC 卡片是否已经进行过社交抽卡互动
**请求体**:
```json
{
  "nfc1": "04:1a:2b:3c:4d:5e:6f",
  "nfc2": "04:2b:3c:4d:5e:6f:7a"
}
```
**响应**:
```json
{
  "hasInteracted": false,
  "nfc1": "04:1a:2b:3c:4d:5e:6f",
  "nfc2": "04:2b:3c:4d:5e:6f:7a"
}
```

### 4. 社交互动获取抽卡次数
```http
POST /api/nfc/social-interaction
```
**描述**: 通过 NFC 社交互动获取抽卡券
**请求体**:
```json
{
  "myNFC": "04:1a:2b:3c:4d:5e:6f",
  "otherNFC": "04:2b:3c:4d:5e:6f:7a"
}
```
**响应**:
```json
{
  "success": true,
  "rewardTickets": 1,
  "txHash": "0x123...",
  "message": "社交互动成功，获得1张抽卡券"
}
```

### 5. 使用抽卡券抽取猫咪 NFT
```http
POST /api/nfc/draw-cat-with-tickets
```
**描述**: 使用抽卡券抽取猫咪 NFT
**请求体**:
```json
{
  "nfcUid": "04:1a:2b:3c:4d:5e:6f",
  "catName": "Lucky Cat"
}
```
**响应**:
```json
{
  "tokenId": "123",
  "name": "Lucky Cat",
  "rarity": "SR",
  "color": "绿色",
  "txHash": "0x123...",
  "nftAddress": "inj1cat123...",
  "metadata": "ipfs://..."
}
```

### 6. 传统付费抽卡
```http
POST /api/nfc/draw-cat-traditional
```
**描述**: 直接支付抽卡费用抽取猫咪 NFT
**请求体**:
```json
{
  "nfcUid": "04:1a:2b:3c:4d:5e:6f",
  "catName": "Fluffy Cat"
}
```
**响应**: 同抽卡券抽卡

### 7. 获取 NFC 抽卡统计信息
```http
GET /api/nfc/draw-stats/{nfcUID}
```
**描述**: 获取指定 NFC 的抽卡次数统计和社交奖励信息
**响应**:
```json
{
  "nfcUID": "04:1a:2b:3c:4d:5e:6f",
  "availableDraws": 3,
  "totalDrawsUsed": 2,
  "traditionalDraws": 1,
  "ticketDraws": 1,
  "socialInteractions": 5
}
```

### 8. 获取已互动的 NFC 列表
```http
GET /api/nfc/interacted-nfcs/{nfcUID}
```
**描述**: 获取指定 NFC 已经互动过的其他 NFC 列表
**响应**:
```json
{
  "success": true,
  "data": {
    "nfcUID": "04:1a:2b:3c:4d:5e:6f",
    "interactedNFCs": [
      {
        "uid": "04:2b:3c:4d:5e:6f:7a",
        "nickname": "朋友的卡片",
        "interactedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalInteractions": 1
  }
}
```

---

## 👤 用户管理 API

### 1. 更新 .inj 域名
```http
PUT /api/user/domain
```
**描述**: 为指定的 NFC UID 设置自定义 .inj 域名
**请求体**:
```json
{
  "uid": "04:1a:2b:3c:4d:5e:6f",
  "domainPrefix": "alice"
}
```

### 2. 获取用户资料
```http
GET /api/user/profile/{uid}
```
**描述**: 根据 NFC UID 获取用户的详细资料
**响应**:
```json
{
  "nfcUID": "04:1a:2b:3c:4d:5e:6f",
  "walletAddress": "inj1abc123...",
  "domain": "alice.inj",
  "nickname": "我的NFC卡片",
  "balance": "1.5000",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "catsOwned": 3,
  "socialInteractions": 5
}
```

### 3. 检查 .inj 域名可用性
```http
GET /api/user/check-domain/{domainPrefix}
```
**描述**: 检查指定的 .inj 域名前缀是否可用
**响应**:
```json
{
  "available": true
}
```

### 4. 删除 .inj 域名
```http
DELETE /api/user/domain/{uid}
```
**描述**: 删除指定 UID 的 .inj 域名

### 5. 根据 .inj 域名查找用户
```http
GET /api/user/search/{domain}
```
**描述**: 通过 .inj 域名查找对应的用户信息
**参数**:
- `domain`: .inj 域名，例如 `alice.inj`

### 6. 获取用户列表
```http
GET /api/user/list?page=1&limit=20
```
**描述**: 获取分页的用户列表
**参数**:
- `page`: 页码（可选，默认 1）
- `limit`: 每页数量（可选，默认 20）

**响应**:
```json
{
  "users": [...],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

### 7. 导出用户私钥
```http
POST /api/user/export-private-key
```
**描述**: 导出指定 NFC 卡片对应的用户私钥（⚠️ 高风险操作）
**请求体**:
```json
{
  "uid": "04:1a:2b:3c:4d:5e:6f",
  "confirmationPhrase": "I understand the security risks"
}
```

---

## 💬 AI 聊天 API

### 1. 与赛博小猫对话
```http
POST /api/chat
```
**描述**: 与 AI 赛博小猫进行对话
**请求体**:
```json
{
  "message": "你好，赛博小猫！",
  "context": "user_context"
}
```
**响应**:
```json
{
  "reply": "喵~ 你好！我是你的赛博小猫助手，有什么可以帮助你的吗？"
}
```

---

## 📊 数据传输对象 (DTO) 规范

### RegisterNFCDto
```typescript
{
  uid: string;           // NFC UID，格式：XX:XX:XX:XX:XX:XX:XX
  nickname?: string;     // 可选昵称
}
```

### RegisterDomainDto
```typescript
{
  uid: string;           // NFC UID
  domainPrefix: string;  // 域名前缀，3-20字符，只能包含字母、数字和连字符
}
```

### SocialInteractionDto
```typescript
{
  myNFC: string;         // 自己的 NFC UID
  otherNFC: string;      // 其他人的 NFC UID
}
```

### DrawCatWithTicketsDto
```typescript
{
  nfcUid: string;        // NFC UID
  catName: string;       // 小猫名称，1-50字符
}
```

---

## 🔧 错误处理

### 通用错误格式
```json
{
  "statusCode": 400,
  "message": "错误信息描述",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/nfc/register"
}
```

### 常见错误状态码
- `400 Bad Request`: 请求参数无效
- `401 Unauthorized`: 未授权访问
- `404 Not Found`: 资源不存在
- `409 Conflict`: 资源冲突（如重复注册）
- `500 Internal Server Error`: 服务器内部错误

---

## 🚀 合约集成

### 智能合约地址
- **NFCWalletRegistry**: NFC 卡片与钱包绑定注册表
- **INJDomainNFT**: .inj 域名 NFT 合约
- **CatNFT_SocialDraw**: 小猫 NFT 社交抽卡合约

### 合约参数约束
- **域名长度**: 3-20 字符
- **抽卡费用**: 0.1 INJ
- **最大小猫数量**: 每用户 100 只
- **稀有度概率**: R(65%), SR(25%), SSR(8%), UR(2%)

---

## 📝 使用示例

### 完整用户流程示例
```javascript
// 1. 注册 NFC
const registration = await fetch('/api/nfc/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: '04:1a:2b:3c:4d:5e:6f',
    nickname: '我的卡片'
  })
});

// 2. 注册域名
const domain = await fetch('/api/nfc/domain/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: '04:1a:2b:3c:4d:5e:6f',
    domainPrefix: 'alice'
  })
});

// 3. 社交互动
const social = await fetch('/api/nfc/social-interaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    myNFC: '04:1a:2b:3c:4d:5e:6f',
    otherNFC: '04:2b:3c:4d:5e:6f:7a'
  })
});

// 4. 抽卡
const cat = await fetch('/api/nfc/draw-cat-with-tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nfcUid: '04:1a:2b:3c:4d:5e:6f',
    catName: 'Lucky Cat'
  })
});
```

---

## 🔐 安全注意事项

1. **私钥安全**: 私钥采用 AES-256-GCM 加密存储
2. **重复保护**: 防止重复社交互动刷券
3. **参数验证**: 严格的输入参数验证
4. **访问控制**: 基于 NFC UID 的访问控制
5. **交易安全**: 所有区块链交易都有重入保护

---

## 📱 前端集成指南

### API 客户端配置
```javascript
const API_BASE_URL = 'http://localhost:8080';

class InjectivePassAPI {
  async request(method, endpoint, data = null) {
    const config = {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(data && { body: JSON.stringify(data) })
    };
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // NFC 操作
  async registerNFC(uid, nickname) {
    return this.request('POST', '/api/nfc/register', { uid, nickname });
  }
  
  async getWallet(uid) {
    return this.request('GET', `/api/nfc/wallet/${uid}`);
  }
  
  // 域名操作
  async registerDomain(uid, domainPrefix) {
    return this.request('POST', '/api/nfc/domain/register', { uid, domainPrefix });
  }
  
  // 小猫 NFT 操作
  async socialInteraction(myNFC, otherNFC) {
    return this.request('POST', '/api/nfc/social-interaction', { myNFC, otherNFC });
  }
  
  async drawCat(nfcUid, catName) {
    return this.request('POST', '/api/nfc/draw-cat-with-tickets', { nfcUid, catName });
  }
}
```

---

*文档最后更新: 2024-01-01*
*API 版本: v1.0*
*Swagger 文档: http://localhost:8080/api*
