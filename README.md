# EOP Protocol (Ethereum of Passkey)

EOP (Ethereum of Passkey) 是一个开创性的去中心化身份验证协议，旨在将 Web2 的无缝用户体验与 Web3 的强大安全性相结合。通过利用 Passkey 技术（如 Face ID, Touch ID），EOP 允许用户在任何 EVM 兼容的区块链上，无需助记词或密码，即可轻松创建和管理钱包。

本项目是 EOP 协议的一个参考实现，展示了如何通过 NFC 卡片作为物理世界的“钥匙”，来触发和管理链上资产，为物理世界和数字世界的交互提供了全新的范式。EOP 协议具有高度的可移植性，可以轻松部署到任何 EVM 兼容链上，如 Ethereum, Polygon, Arbitrum 等。

## 技术栈

- **后端框架**: NestJS + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **区块链**: EVM-compatible Blockchains (e.g., Ethereum, Polygon) + ethers.js
- **加密**: AES-256-GCM私钥加密存储
- **部署**: Docker + Docker Compose + Nginx

## 核心功能

### 1. 多样化的钱包创建方式

EOP协议支持多种钱包创建方式，旨在降低用户进入Web3的门槛：

- **NFC实体卡片创建**: 用户只需将NFC卡片贴近设备，即可自动生成一个安全的EVM兼容钱包，实现物理世界与数字资产的无缝连接。
- **Passkey (iOS/Android)**: 针对Web2用户，我们支持通过Passkey（如Face ID, Touch ID）一键创建钱包，无需记忆复杂的助记词，体验如丝般顺滑。
- **传统Web3方式**: 同时，我们也为资深Web3用户保留了通过传统方式（如助记词）创建和导入钱包的选项。

### 2. NFT Minting

- 用户成功创建钱包后，可以Mint一枚独特的小猫NFT作为纪念，开启他们的Web3之旅。

### 3. 安全特性

- 私钥加密存储，不明文落库
- API文档自动生成（Swagger）
- 请求验证和错误处理
- 安全HTTP头设置

## 快速开始

### 环境要求

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+

### 1. 克隆项目

```bash
git clone <repository-url>
cd nfc-wallet-backend
```

### 2. 环境配置

```bash
# 复制环境变量配置
cp env.example .env

# 编辑配置文件
nano .env
```

**重要配置项**:

```env
# 数据库连接
DATABASE_URL="postgresql://nfc_user:secure_password_123@localhost:5432/nfc_wallet?schema=public"

# AES加密密钥 (64字符十六进制字符串)
AES_ENCRYPTION_KEY="a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890"

# JWT密钥
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

### 3. 使用Docker运行

#### 开发环境

```bash
# 启动数据库
docker-compose up postgres redis -d

# 安装依赖
npm install

# 生成Prisma客户端
npm run prisma:generate

# 数据库迁移
npm run prisma:migrate

# 启动开发服务器
npm run start:dev
```

#### 生产环境

```bash
# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api
```

### 4. 数据库迁移

```bash
# 推送数据库架构
npm run prisma:push

# 或者使用迁移
npm run prisma:migrate

# 打开Prisma Studio（可选）
npm run prisma:studio
```

## API文档

服务启动后，访问 `http://localhost:3000/api` 查看完整的API文档。

### 主要API端点

#### NFC钱包管理

- `POST /api/nfc/register` - 注册NFC卡片并生成钱包
- `GET /api/nfc/wallet/:uid` - 根据UID获取钱包信息
- `GET /api/nfc/stats` - 获取钱包统计信息

#### 用户管理

- `PUT /api/user/username` - 更新用户名
- `GET /api/user/profile/:uid` - 获取用户资料
- `GET /api/user/check-username/:username` - 检查用户名可用性
- `DELETE /api/user/username/:uid` - 删除用户名

### API使用示例

#### 注册NFC卡片

```bash
curl -X POST http://localhost:3000/api/nfc/register \
  -H "Content-Type: application/json" \
  -d '{"uid": "04:1a:2b:3c:4d:5e:6f"}'
```

响应：

```json
{
  "address": "0x742d35Cc6bb7C582D60",
  "uid": "04:1a:2b:3c:4d:5e:6f",
  "username": null,
  "isNewWallet": true,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### 更新用户名

```bash
curl -X PUT http://localhost:3000/api/user/username \
  -H "Content-Type: application/json" \
  -d '{"uid": "04:1a:2b:3c:4d:5e:6f", "username": "alice123"}'
```

## 数据库架构

### NFCWallet表

```sql
CREATE TABLE nfc_wallets (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL,  -- NFC UID
  address VARCHAR(42) NOT NULL,      -- 以太坊地址
  private_key_enc TEXT NOT NULL,     -- 加密的私钥
  username VARCHAR(50) UNIQUE,       -- 用户名（可选且唯一）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 安全说明

### 私钥保护

- 私钥使用AES-256-GCM算法加密
- 加密密钥存储在环境变量中
- 私钥不会通过API返回给客户端

### 生产环境安全

1. **更改默认密钥**: 生产环境必须更改所有默认密码和密钥
2. **HTTPS配置**: 启用SSL/TLS加密传输
3. **防火墙设置**: 限制数据库端口访问
4. **定期备份**: 配置数据库自动备份

## 部署指南

### 生产环境部署

1. **服务器准备**

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **SSL证书配置**

```bash
# 创建SSL目录
mkdir ssl

# 获取Let's Encrypt证书（示例）
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
```

3. **生产环境配置**

```bash
# 修改docker-compose.yml中的环境变量
# 启用nginx.conf中的HTTPS配置
# 设置强密码和密钥

# 启动服务
docker-compose up -d
```

### 监控和日志

```bash
# 查看服务状态
docker-compose ps

# 查看API日志
docker-compose logs -f api

# 查看Nginx日志
docker-compose logs -f nginx

# 查看数据库日志
docker-compose logs -f postgres
```

## 开发指南

### 项目结构

```
src/
├── app.module.ts          # 应用主模块
├── main.ts               # 应用入口
├── prisma/               # 数据库服务
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── crypto/               # 加密服务
│   ├── crypto.module.ts
│   └── crypto.service.ts
├── nfc/                  # NFC钱包管理
│   ├── dto/
│   ├── nfc.controller.ts
│   ├── nfc.service.ts
│   └── nfc.module.ts
└── user/                 # 用户管理
    ├── dto/
    ├── user.controller.ts
    ├── user.service.ts
    └── user.module.ts
```

### 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start:dev

# 运行测试
npm run test

# 代码格式化
npm run format

# 代码检查
npm run lint

# 构建项目
npm run build
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查DATABASE_URL配置
   - 确认PostgreSQL服务运行状态
   - 验证网络连接

2. **私钥加密失败**
   - 检查AES_ENCRYPTION_KEY长度（必须64字符）
   - 确认密钥为有效的十六进制字符串

3. **Docker启动失败**
   - 检查端口占用：`netstat -tlnp | grep :3000`
   - 查看容器日志：`docker-compose logs api`

### 性能优化

1. **数据库优化**
   - 为常用查询字段添加索引
   - 定期执行VACUUM和ANALYZE
   - 配置连接池

2. **应用优化**
   - 启用Redis缓存
   - 配置负载均衡
   - 使用CDN加速静态资源

## 贡献指南

1. Fork项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 许可证

本项目采用MIT许可证 - 详见 [LICENSE](LICENSE) 文件。

## 支持与联系

如有问题或建议，请提交Issue或联系开发团队。 