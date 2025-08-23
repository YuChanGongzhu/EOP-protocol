# Injective Pass Frontend

Injective Pass 的前端用户界面，提供 NFC 钱包管理、域名注册和 NFT 铸造的完整用户体验。

## 🎯 功能特性

### 用户界面
- **现代化设计**: 基于动态背景和流畅动画的现代 UI
- **多语言支持**: 中文/英文切换
- **主题切换**: 日间/夜间模式
- **响应式设计**: 支持手机、平板和桌面设备

### 核心功能
- **钱包连接**: 支持 MetaMask、TokenPocket 等钱包
- **NFC 扫描**: Web NFC API 集成，支持物理卡片绑定
- **域名注册**: 直观的 .inj 域名注册流程
- **NFT 展示**: 精美的 NFT 收藏品展示界面
- **交易记录**: 完整的活动历史记录

## 🚀 快速开始

### 系统要求
- 现代浏览器（支持 ES6+）
- HTTPS 环境（NFC 功能需要）
- 后端服务运行在 `localhost:8080`

### 本地开发

1. **启动后端服务**
```bash
cd nfc-wallet-backend
docker compose up -d
```

2. **配置前端**
```bash
cd front-end
# 确认 app.js 中的 API_BASE_URL 配置
const API_BASE_URL = 'http://localhost:8080';
```

3. **启动开发服务器**
```bash
# 使用 Python 快速启动
python3 -m http.server 3000

# 或使用 Node.js
npx http-server -p 3000

# 或使用 live-server
npx live-server --port=3000
```

4. **访问应用**
```
http://localhost:3000
```

### 生产部署

1. **构建优化**
```bash
# 压缩 CSS 和 JS（可选）
npx terser app.js -o app.min.js
npx csso styles.css -o styles.min.css
```

2. **HTTPS 配置**
```bash
# 使用 nginx 或 apache 配置 HTTPS
# NFC 功能需要 HTTPS 环境
```

3. **后端连接配置**
```javascript
// 修改 app.js 中的 API_BASE_URL
const API_BASE_URL = 'https://your-api-domain.com';
```

## 🏗️ 项目结构

```
front-end/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── app.js             # 主应用逻辑
└── README.md          # 前端文档
```

## 🎨 UI 组件

### 页面结构
```
┌─────────────────────────────────────┐
│             Welcome Screen          │
│  ┌─────────────────────────────────┐ │
│  │      Injective Pass Hero        │ │
│  │     创建连接物理世界的专属身份     │ │
│  │                                 │ │
│  │  ✓ 拍Bonjour卡1秒获取Inj身份    │ │
│  │  ✓ 免费创建专属域名畅游生态      │ │
│  │  ✓ MCP云托管无需牢记复杂密码     │ │
│  │                                 │ │
│  │   [ 立即创建 Injective Pass ]   │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│            Dashboard Screen         │
│  ┌─────────────────────────────────┐ │
│  │          ID Card Display        │ │
│  │     [NFT Image] [QR Code]       │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │         Balance Section         │ │
│  │    Total: 1.25 INJ ≈ $30 USDT  │ │
│  │         Inj XP: 1500           │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │       Collection Grid          │ │
│  │     [NFT] [NFT] [NFT] [NFT]    │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 核心组件

#### 1. 欢迎页面 (`welcome-wallet-screen`)
- Hero 区域展示
- 功能特性列表
- CTA 按钮

#### 2. 钱包选择 (`wallet-screen`)
- 支持多种钱包类型
- Adventure 25' 热门标记
- 跳过选项

#### 3. NFC 扫描 (`nfc-scan-screen`)
- 扫描动画效果
- 实时状态显示
- 跳过扫描选项

#### 4. 域名注册 (`minting-screen`)
- 域名输入和验证
- 可用性检查
- 铸造进度显示

#### 5. 仪表盘 (`dashboard-screen`)
- ID 卡片展示
- 余额和资产信息
- NFT 收藏品网格

#### 6. 底部导航 (`tab-bar`)
- Pass、生态、活动、设置
- 图标和文字标签
- 活动状态指示

## 🔧 配置和集成

### API 集成配置
```javascript
// app.js 中的配置
const API_BASE_URL = 'http://localhost:8080';

const apiClient = {
    async register(data) {
        const response = await fetch(`${API_BASE_URL}/api/nfc/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    
    async registerDomain(data) {
        const response = await fetch(`${API_BASE_URL}/api/nfc/register-domain`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },
    
    async drawCat(data) {
        const response = await fetch(`${API_BASE_URL}/api/nfc/draw-cat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return response.json();
    }
};
```

### 钱包集成
```javascript
// MetaMask 连接
async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            return accounts[0];
        } catch (error) {
            console.error('MetaMask connection failed:', error);
        }
    }
}

// 网络切换到 Injective EVM
async function switchToInjectiveNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x59F' }], // 1439 in hex
        });
    } catch (switchError) {
        // 如果网络不存在，添加网络
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x59F',
                    chainName: 'Injective EVM Testnet',
                    rpcUrls: ['https://k8s.testnet.json-rpc.injective.network/'],
                    nativeCurrency: {
                        name: 'Injective',
                        symbol: 'INJ',
                        decimals: 18
                    },
                    blockExplorerUrls: ['https://testnet.blockscout.injective.network/']
                }]
            });
        }
    }
}
```

### NFC 功能集成
```javascript
// Web NFC API 检测
function isNFCSupported() {
    return 'NDEFReader' in window;
}

// NFC 扫描
async function startNFCScan() {
    if (!isNFCSupported()) {
        throw new Error('NFC not supported');
    }
    
    try {
        const ndef = new NDEFReader();
        await ndef.scan();
        
        ndef.addEventListener('reading', ({ message, serialNumber }) => {
            console.log('NFC Tag detected:', serialNumber);
            handleNFCDetected(serialNumber);
        });
    } catch (error) {
        console.error('NFC scan failed:', error);
    }
}
```

## 🎨 样式和主题

### CSS 变量系统
```css
:root {
    /* 主色调 */
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    
    /* 文字颜色 */
    --primary-text: #2d3748;
    --secondary-text: #4a5568;
    --muted-text: #718096;
    
    /* 背景色 */
    --bg-primary: #ffffff;
    --bg-secondary: #f7fafc;
    --card-bg: rgba(255, 255, 255, 0.95);
    
    /* 边框和阴影 */
    --border-radius: 12px;
    --card-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

/* 暗色主题 */
[data-theme="dark"] {
    --primary-text: #f7fafc;
    --secondary-text: #e2e8f0;
    --muted-text: #a0aec0;
    --bg-primary: #1a202c;
    --bg-secondary: #2d3748;
    --card-bg: rgba(45, 55, 72, 0.95);
}
```

### 动画效果
```css
/* 背景动画 */
.animated-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    overflow: hidden;
}

.blur-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    animation: float 6s ease-in-out infinite;
}

@keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(180deg); }
}

/* 卡片悬停效果 */
.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
}
```

## 📱 响应式设计

### 断点系统
```css
/* 移动设备 */
@media (max-width: 768px) {
    .hero-content {
        text-align: center;
        padding: 2rem 1rem;
    }
    
    .wallet-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
    
    .collection-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* 平板设备 */
@media (min-width: 769px) and (max-width: 1024px) {
    .collection-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

/* 桌面设备 */
@media (min-width: 1025px) {
    .collection-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}
```

## 🧪 测试和调试

### 本地测试
```bash
# 启动开发服务器
python3 -m http.server 3000

# 测试 API 连接
curl http://localhost:8080/api/nfc/stats

# 检查浏览器控制台
# 确认没有 CORS 错误
# 验证 NFC API 支持
```

### 功能测试清单
- [ ] 钱包连接功能
- [ ] NFC 扫描功能（需要 HTTPS）
- [ ] 域名注册流程
- [ ] NFT 展示
- [ ] 主题切换
- [ ] 语言切换
- [ ] 响应式布局

### 浏览器兼容性
| 功能 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| 基础功能 | ✅ | ✅ | ✅ | ✅ |
| Web NFC | ✅ | ❌ | ❌ | ✅ |
| MetaMask | ✅ | ✅ | ✅ | ✅ |

## 🔧 开发工具

### 推荐 VS Code 扩展
- Live Server
- Prettier
- ESLint
- CSS Peek
- Auto Rename Tag

### 调试技巧
```javascript
// 启用开发模式
const isDevelopment = location.hostname === 'localhost';

// 调试 API 调用
if (isDevelopment) {
    console.log('API Request:', data);
    console.log('API Response:', response);
}

// 模拟 NFC 扫描（开发环境）
if (isDevelopment && !isNFCSupported()) {
    // 使用模拟数据
    setTimeout(() => {
        handleNFCDetected('04:ab:cd:ef:12:34:56');
    }, 2000);
}
```

## 🚀 性能优化

### 资源优化
```html
<!-- 预加载关键资源 -->
<link rel="preload" href="styles.css" as="style">
<link rel="preload" href="app.js" as="script">

<!-- 延迟加载非关键资源 -->
<script defer src="app.js"></script>

<!-- 字体优化 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### 图片优化
- 使用 WebP 格式
- 设置适当的尺寸
- 实现懒加载

### 缓存策略
```javascript
// Service Worker 缓存（可选）
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
```

## 🔒 安全考虑

### XSS 防护
```javascript
// 输入验证和转义
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}
```

### HTTPS 要求
- NFC 功能必须在 HTTPS 环境下运行
- 生产环境必须使用 SSL 证书

### 钱包安全
- 不存储私钥
- 使用安全的签名流程
- 验证交易数据

## 📞 故障排除

### 常见问题

#### NFC 不工作
- 确认浏览器支持 Web NFC API
- 检查是否在 HTTPS 环境
- 验证设备硬件支持

#### 钱包连接失败
- 检查 MetaMask 是否安装
- 确认网络配置正确
- 验证权限设置

#### API 调用失败
- 检查后端服务状态
- 验证 CORS 配置
- 确认 API_BASE_URL 设置

### 调试步骤
1. 打开浏览器开发者工具
2. 检查控制台错误信息
3. 验证网络请求状态
4. 测试 API 端点连通性

---

**版本**: 1.0.0  
**最后更新**: 2025年7月27日  
**开发团队**: Injective Pass Labs
