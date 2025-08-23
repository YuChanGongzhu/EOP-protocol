# Injective NFC Wallet Backend

基于 Injective EVM 的 NFC 钱包后端服务，支持 NFC 卡片绑定、域名注册和 NFT 铸造功能。

## 🎯 功能特性

### 核心功能
- **NFC 钱包注册**: 支持物理 NFC 卡片与数字钱包绑定
- **域名管理**: 注册和管理 `.inj` 域名 NFT
- **猫咪 NFT**: 铸造和管理独特的猫咪 NFT（7种颜色）
- **实际 IPFS 图片**: 所有 NFT 都有真实的 IPFS 托管图片

### 技术特性
- **Injective EVM 集成**: 完整的智能合约交互
- **生产级加密**: AES-256 加密和 JWT 认证
- **Docker 容器化**: 完整的 Docker Compose 部署
- **健康检查**: 完善的服务监控和错误处理
- **CORS 支持**: 跨域请求处理

## 🧭 系统设计速览（给协作同学）

本后端是一个基于 NestJS 的“链抽象网关 + 账号资产服务”，面向 Injective EVM：

- 角色与职责
  - API 层（NestJS）: 暴露 NFC/域名/NFT/用户等 REST 接口与 Swagger 文档
  - 合约访问层（ethers + @injectivelabs/sdk-ts）: 与三类合约交互 `NFCWalletRegistry`、`INJDomainNFT`、`CatNFT_SocialDraw`
  - 数据层（Prisma/PostgreSQL）: 落库用户、NFC 卡、交易、猫咪 NFT 等业务数据
  - 安全层（AES-256-GCM + JWT + Helmet/CORS）: 私钥加密存储、接口鉴权与安全头

- 模块划分（`src/`）
  - `nfc/`: 控制器与服务，编排业务流程（注册/绑定/社交互动/抽卡/统计）
  - `contract/`: `injective.service.ts`（银行与 EVM 交易、授权与抽卡）、`contract.service.ts`（EVM 合约便捷封装）
  - `crypto/`: 私钥加解密与钱包生成
  - `prisma/`: 数据库访问

- 核心数据模型（Prisma 简述）
  - `User(1) ↔ NFCCard(1)`: 一人一卡绑定；`User` 持 inj/eth 地址、加密私钥、域名、初始化资金标记
  - `CatNFT(*)`: 用户持有的猫咪 NFT（tokenId/rarity/color/metadata）
  - `Transaction(*)`: 记录链上交易哈希/金额/状态/原始回执

- 关键链上交互
  - 绑定: `detectAndBindBlankCard(nfcUID, userEth)`（注册后自动/手动）
  - 社交: `socialInteraction(myNFC, otherNFC)`（获券，需操作者授权）
  - 抽卡: `drawCatNFTWithTickets(nfcUID, catName)`（消耗 1 张券 + drawFee）
  - 域名: `mintDomainNFT(domainSuffix, nfcUID, metadata)`（生成 `advx-<suffix>.inj`）

- 端到端典型流程
  1) 注册 NFC → 生成/落库钱包（inj/eth）→ 发送初始资金（inj 地址）→ 合约自动绑定
  2) 社交互动换券（自动授权缺省用户）
  3) 用券抽卡（花费 drawFee + gas，入库 NFT 与交易）
  4) 可选注册域名（需已 funded）

- 研发与联调要点
  - 所有写入交易都通过后台“以用户私钥签名”或“合约 owner 授权”方式完成
  - EVM 交易用 `ethers`，银行转账与账户信息用 `@injectivelabs/sdk-ts`
  - ABI 位于 `src/contract/abis/`（构建时由 `copy-abis.js` 写入）
  - 推荐先读 `TEST_FLOW_GUIDE.md` 快速过一遍 CLI 流程

提示：近期修复汇总见 `REPAIR_REPORT.md`，包含初始资金地址规范化、合约路由注册、CatNFT ABI 更正与 DB 唯一冲突回退。

## 🚀 快速开始

### 系统要求
- Docker 和 Docker Compose
- Node.js 18+ (开发环境)
- 至少 2GB RAM

### 生产部署 (推荐)

1. **克隆项目**
```bash
git clone <repository-url>
cd nfc-wallet-backend
```

2. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置以下必要参数：
# - DATABASE_URL: PostgreSQL 数据库连接字符串
# - AES_ENCRYPTION_KEY: 32字节十六进制加密密钥
# - JWT_SECRET: JWT 认证密钥
# - CONTRACT_PRIVATE_KEY: 合约部署者私钥
# - NFC_REGISTRY_ADDRESS: NFC钱包注册合约地址
# - DOMAIN_REGISTRY_ADDRESS: 域名NFT合约地址  
# - CAT_NFT_ADDRESS: 猫咪NFT合约地址

# ⚠️ 重要：请不要将 .env 文件提交到 Git！
```

3. **启动服务**
```bash
# 构建并启动所有服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f api
```

4. **验证部署**
```bash
# 测试 API 健康状态
curl http://localhost:8080/api/nfc/stats

# 测试 Nginx 代理
curl http://localhost:8001/api/nfc/stats
```

### 开发环境

1. **安装依赖**
```bash
npm install
```

2. **数据库设置**
```bash
# 启动数据库服务
docker compose up -d postgres redis

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma db push
```

3. **启动开发服务器**
```bash
npm run start:dev
```

## 🏗️ 架构概览

### 服务架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Nginx Proxy   │    │   API Server    │
│   (Port 3000)   │───▶│   (Port 8001)   │───▶│   (Port 8080)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │     Redis       │
                       │   (Port 5432)   │    │   (Port 6379)   │
                       └─────────────────┘    └─────────────────┘
```

### 智能合约
- **NFCWalletRegistry**: `0x775D0D30dc990b8068768CCE58ad47ff167700cf`
- **INJDomainNFT**: `0xf978481B334ba5572717c528ba730EF4A12DA191`
- **CatNFT**: `0x049B99fc53a39e8eF6DC725EBA32f0FCd7053c22`

## 📡 API 文档

### 基础信息
- **Base URL**: `http://localhost:8080/api`
- **认证**: Bearer Token (JWT)
- **Content-Type**: `application/json`

### 核心端点

#### NFC 管理
```http
POST /nfc/register
Content-Type: application/json

{
  "uid": "04:ab:cd:ef:12:34:56",
  "walletAddress": "0x742d35Cc6434C0532925a3b8D7CbAF2d",
  "signature": "0x..."
}
```

#### 域名管理
```http
POST /nfc/register-domain
Content-Type: application/json

{
  "nfcUid": "04:ab:cd:ef:12:34:56",
  "domainName": "alice"
}
```

#### NFT 管理

**社交互动获取抽卡次数**
```http
POST /nfc/social-interaction
Content-Type: application/json

{
  "myNFC": "04:ab:cd:ef:12:34:56",
  "otherNFC": "04:fe:dc:ba:98:76:54"
}
```

**使用抽卡次数抽取猫咪NFT**
```http
POST /nfc/draw-cat-with-tickets
Content-Type: application/json

{
  "nfcUid": "04:ab:cd:ef:12:34:56",
  "catName": "小花"
}
```

**传统抽卡方式（付费）**
```http
POST /nfc/draw-cat
Content-Type: application/json

{
  "nfcUid": "04:ab:cd:ef:12:34:56",
  "catName": "小花"
}
```

#### 查询接口

**系统统计**
```http
GET /nfc/stats
```

**用户所有NFT**
```http
GET /nfc/user-nfts/{walletAddress}
```

**用户域名NFT**
```http
GET /nfc/user-domain-nft/{walletAddress}
```

**用户猫咪NFT**
```http
GET /nfc/user-cat-nfts/{walletAddress}
```

**NFC抽卡统计信息**
```http
GET /nfc/draw-stats/{nfcUID}

Response:
{
  "success": true,
  "data": {
    "availableDraws": 3,      // 可用抽卡次数
    "usedDraws": 7,           // 已使用抽卡次数
    "totalDraws": 10,         // 总获得抽卡次数
    "socialBonus": 15         // 社交奖励值
  }
}
```

**获取已互动的NFC列表**
```http
GET /nfc/interacted-nfcs/{nfcUID}

Response:
{
  "success": true,
  "data": {
    "interactedNFCs": ["04:aa:bb:cc:dd:ee:ff", "04:11:22:33:44:55:66"]
  }
}
```

### 响应格式

**成功响应**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "tokenId": "123",
    "imageUrl": "https://ipfs.io/ipfs/..."
  },
  "message": "操作成功"
}
```

**社交互动响应**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "rewardTickets": 1,
    "totalTickets": 3
  },
  "message": "社交互动成功，获得1张抽卡券"
}
```

**抽卡响应**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x...",
    "tokenId": "123",
    "catName": "小花",
    "rarity": "SR",
    "color": "橙色",
    "imageUrl": "https://tan-academic-booby-265.mypinata.cloud/ipfs/QmW5vB4dT8YzN3jF7LqV5rX2cK9gE6bR8tN4mZ3hU1sQ7w/cat_orange.png"
  },
  "message": "抽卡成功"
}
```

**错误响应**
```json
{
  "success": false,
  "error": "No draw tickets available",
  "message": "没有可用的抽卡次数"
}
```

## 📋 智能合约接口说明

### CatNFT 合约 (0x10fd6cC8d9272caC010224A93e1FA00Ce291E6D8)

#### 核心功能函数

**社交互动函数**
```solidity
function socialInteraction(string memory myNFC, string memory otherNFC) external nonReentrant onlyAuthorizedOperator
```
- **功能**: 用户通过NFC社交互动获取抽卡次数
- **参数**: 
  - `myNFC`: 自己的NFC UID
  - `otherNFC`: 其他用户的NFC UID
- **限制**: 
  - 两个NFC必须都已注册
  - 不能与自己互动
  - 每对NFC只能互动一次
  - 只有授权操作员可调用
- **奖励**: 每次成功互动获得1张抽卡券

**抽卡函数**
```solidity
function drawCatNFTWithTickets(string memory nfcUID, string memory catName) external payable nonReentrant onlyAuthorizedOperator
```
- **功能**: 使用抽卡次数抽取猫咪NFT
- **参数**: 
  - `nfcUID`: NFC UID
  - `catName`: 猫咪名称（可重复）
- **限制**: 
  - 需要至少1张抽卡券
  - 需要支付手续费（drawFee）
  - NFC必须已注册
  - 每个钱包最多拥有20只猫
- **稀有度**: 基于社交互动次数提升稀有度概率

#### 查询函数

**获取可用抽卡次数**
```solidity
function getAvailableDrawCount(string memory nfcUID) external view returns (uint256)
```

**获取已使用抽卡次数**
```solidity
function getTotalDrawsUsed(string memory nfcUID) external view returns (uint256)
```

**获取抽卡统计**
```solidity
function getDrawStats(string memory nfcUID) external view returns (uint256 available, uint256 used, uint256 total)
```

**获取社交奖励值**
```solidity
function getSocialBonus(string memory nfcUID) external view returns (uint256)
```

**获取已互动NFC列表**
```solidity
function getInteractedNFCs(string memory nfcUID) external view returns (string[] memory)
```

#### 稀有度系统

**稀有度等级** (基础概率)
- **R**: 65% (普通)
- **SR**: 25% (稀有) 
- **SSR**: 8% (超稀有)
- **UR**: 2% (极稀有)

**社交奖励机制**
- 每次社交互动增加社交奖励值
- 社交奖励值提升稀有度概率：
  - UR概率 += 社交奖励值 ÷ 4
  - SSR概率 += 社交奖励值 ÷ 2  
  - SR概率 += 社交奖励值

### 重要变更说明

**与旧版本的区别**:
1. **分离功能**: 社交互动和抽卡现在是两个独立的函数
2. **抽卡券系统**: 通过社交互动获得抽卡券，然后消费抽卡券抽取NFT
3. **猫名可重复**: 移除了全局唯一猫名限制
4. **社交奖励**: 增加了基于社交互动的稀有度提升机制

## 🔧 配置参数

### 环境变量 (.env)
```env
# 数据库配置
DATABASE_URL="postgresql://nfc_user:secure_password_123@localhost:5432/nfc_wallet?schema=public"

# 加密密钥 (32字节十六进制)
AES_ENCRYPTION_KEY="8ae40a4aa398d775f6b3ff48079003f45d1c90369f331defa1ea9f79ab85b759"

# JWT 密钥
JWT_SECRET="DeF9z3wcr88RtKI8bSVhs8wZWNYZPK7OL6/sx2WhSxU="

# 服务配置
PORT=3000
NODE_ENV="production"

# Injective 配置
INJECTIVE_RPC_URL="https://k8s.testnet.json-rpc.injective.network/"
INJECTIVE_CHAIN_ID="1439"
CONTRACT_PRIVATE_KEY="your-private-key-here"

# 合约地址
NFC_REGISTRY_ADDRESS="0x775D0D30dc990b8068768CCE58ad47ff167700cf"
DOMAIN_REGISTRY_ADDRESS="0xf978481B334ba5572717c528ba730EF4A12DA191"
CATNFT_CONTRACT_ADDRESS="0x10fd6cC8d9272caC010224A93e1FA00Ce291E6D8"
```

### Docker Compose 端口配置
- **API 服务**: `localhost:8080` → `container:3000`
- **Nginx 代理**: `localhost:8001` → `container:80`
- **PostgreSQL**: `localhost:5432` → `container:5432`
- **Redis**: `localhost:6379` → `container:6379`

## 🛠️ 开发指南

### 项目结构
```
nfc-wallet-backend/
├── src/                     # 源代码
│   ├── nfc/                # NFC 服务模块
│   ├── user/               # 用户管理模块
│   ├── crypto/             # 加密服务
│   ├── contract/           # 智能合约集成
│   └── prisma/             # 数据库服务
├── prisma/                 # 数据库模式
├── docker-compose.yml      # Docker 编排
├── Dockerfile             # 容器构建
├── nginx.conf             # Nginx 配置
└── .env                   # 环境变量
```

### 常用命令
```bash
# 开发
npm run start:dev          # 启动开发服务器
npm run build              # 构建生产版本
npm run test               # 运行测试

# Docker
docker compose up -d       # 启动所有服务
docker compose down        # 停止所有服务
docker compose logs api    # 查看 API 日志
docker compose restart api # 重启 API 服务

# 数据库
npx prisma studio          # 打开数据库管理界面
npx prisma db push         # 推送模式变更
npx prisma generate        # 生成客户端代码
```

### 添加新功能
1. 在 `src/` 目录下创建新模块
2. 更新数据库模式 (`prisma/schema.prisma`)
3. 添加相应的 API 端点
4. 更新 Docker 配置（如需要）
5. 编写测试用例

## 🧪 测试

### API 测试
```bash
# 健康检查
curl http://localhost:8080/api/nfc/stats

# NFC 注册测试
curl -X POST http://localhost:8080/api/nfc/register \
  -H "Content-Type: application/json" \
  -d '{"uid":"04:ab:cd:ef:12:34:56","walletAddress":"0x742d35Cc6434C0532925a3b8D7CbAF2d","signature":"0x..."}'

# 域名注册测试
curl -X POST http://localhost:8080/api/nfc/register-domain \
  -H "Content-Type: application/json" \
  -d '{"nfcUid":"04:ab:cd:ef:12:34:56","domainName":"test"}'

# 社交互动测试
curl -X POST http://localhost:8080/api/nfc/social-interaction \
  -H "Content-Type: application/json" \
  -d '{"myNFC":"04:ab:cd:ef:12:34:56","otherNFC":"04:fe:dc:ba:98:76:54"}'

# 使用抽卡券抽取猫咪NFT
curl -X POST http://localhost:8080/api/nfc/draw-cat-with-tickets \
  -H "Content-Type: application/json" \
  -d '{"nfcUid":"04:ab:cd:ef:12:34:56","catName":"小花"}'

# 传统付费抽卡
curl -X POST http://localhost:8080/api/nfc/draw-cat \
  -H "Content-Type: application/json" \
  -d '{"nfcUid":"04:ab:cd:ef:12:34:56","catName":"小花"}'

# 查询抽卡统计
curl http://localhost:8080/api/nfc/draw-stats/04:ab:cd:ef:12:34:56

# 查询已互动NFC列表
curl http://localhost:8080/api/nfc/interacted-nfcs/04:ab:cd:ef:12:34:56
```

### 容器健康检查
```bash
# 检查所有容器状态
docker compose ps

# 检查 API 健康状态
docker compose exec api curl -f http://localhost:3000/api/nfc/stats

# 检查数据库连接
docker compose exec postgres pg_isready -U nfc_user -d nfc_wallet
```

## 🐛 故障排除

### 常见问题

#### API 无法启动
```bash
# 检查日志
docker compose logs api

# 检查环境变量
docker compose exec api env | grep -E "(DATABASE_URL|AES_ENCRYPTION_KEY)"

# 重启服务
docker compose restart api
```

#### 数据库连接失败
```bash
# 检查数据库状态
docker compose ps postgres

# 测试连接
docker compose exec postgres psql -U nfc_user -d nfc_wallet -c "SELECT 1;"

# 重新初始化
docker compose down
docker volume rm nfc-wallet-backend_postgres_data
docker compose up -d
```

#### 端口冲突
```bash
# 检查端口占用
lsof -i :8080
lsof -i :8001

# 修改 docker-compose.yml 中的端口映射
# 重启服务
docker compose down && docker compose up -d
```

#### NFT 图片无法加载
- 检查 IPFS 链接是否可访问
- 验证 `generateCatImageUrl` 和 `generateDomainImageUrl` 函数
- 确认网络连接正常

### 日志分析
```bash
# API 服务日志
docker compose logs -f api

# Nginx 访问日志
docker compose logs -f nginx

# 数据库日志
docker compose logs -f postgres

# 实时监控所有服务
docker compose logs -f
```

## 🔒 安全注意事项

1. **私钥安全**: 生产环境中更换 `CONTRACT_PRIVATE_KEY`
2. **JWT 密钥**: 使用强随机 `JWT_SECRET`
3. **数据库密码**: 更改默认的数据库密码
4. **HTTPS**: 生产环境启用 SSL/TLS
5. **防火墙**: 限制不必要的端口访问

## 📈 监控和维护

### 性能监控
- API 响应时间
- 数据库连接池状态
- 内存和 CPU 使用率
- 容器健康状态

### 备份策略
```bash
# 数据库备份
docker compose exec postgres pg_dump -U nfc_user nfc_wallet > backup.sql

# 恢复数据库
cat backup.sql | docker compose exec -T postgres psql -U nfc_user -d nfc_wallet
```

### 更新部署
```bash
# 拉取最新代码
git pull origin main

# 重新构建并部署
docker compose build api
docker compose up -d

# 验证更新
curl http://localhost:8080/api/nfc/stats
```

## 📞 支持

如有问题或建议，请：
1. 查看本文档的故障排除部分
2. 检查 GitHub Issues
3. 联系开发团队

---

**版本**: 1.0.0  
**最后更新**: 2025年7月27日  
**开发团队**: Injective Pass Labs