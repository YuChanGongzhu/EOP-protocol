#!/usr/bin/env node

/**
 * Injective Pass 综合测试脚本
 * 结合合约级参数约束进行全面系统测试
 */

const axios = require('axios');
const colors = require('colors');

// 测试配置
const CONFIG = {
    BASE_URL: 'http://localhost:8080',
    TIMEOUT: 30000,

    // 合约参数约束
    CONSTRAINTS: {
        NFC: {
            MIN_LENGTH: 1,
            MAX_LENGTH: 255,
            VALID_FORMATS: [
                /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/,              // 4字节
                /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, // 7字节
                /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/ // 8字节
            ]
        },
        DOMAIN: {
            MIN_LENGTH: 1,      // 合约 MIN_DOMAIN_LENGTH
            MAX_LENGTH: 25,     // 合约 MAX_DOMAIN_LENGTH(30) - advx-(5) = 25 
            PREFIX: 'advx-',    // 合约自动添加的前缀
            SUFFIX: '.inj',     // 自动添加的后缀
            PATTERN: /^[a-z0-9]+([a-z0-9-]*[a-z0-9])*$/, // 允许小写字母、数字和连字符
            FORBIDDEN_PATTERNS: ['--', '']  // 禁止连续连字符、空字符串
        },
        CAT: {
            MAX_NAME_LENGTH: 50,
            MIN_NAME_LENGTH: 1,
            MAX_CATS_PER_USER: 100,  // 对应合约 MAX_CATS_PER_USER
            DRAW_FEE: '0.1',         // 对应合约 drawFee
            RARITIES: ['R', 'SR', 'SSR', 'UR'],
            COLORS: ['黑色', '绿色', '红色', '橘色', '紫色', '蓝色', '彩虹']
        },
        WALLET: {
            INITIAL_FUND_AMOUNT: '0.1',  // INJ
            ADDRESS_PATTERN: /^inj[a-z0-9]{39}$/
        }
    }
};

// 测试数据
const TEST_DATA = {
    // 有效的NFC UIDs
    VALID_NFCS: [
        '04:1a:2b:3c:4d:5e:6f',          // 7字节格式
        '04:2b:3c:4d:5e:6f:7a',          // 7字节格式  
        '04:3c:4d:5e:6f:7a:8b:9c',       // 8字节格式
        '01:23:45:67'                     // 4字节格式
    ],

    // 无效的NFC UIDs（用于边界测试）
    INVALID_NFCS: [
        '',                               // 空字符串
        '04:1a:2b',                      // 太短
        '04:1a:2b:3c:4d:5e:6f:8a:9b:0c:1d:2e', // 太长
        'invalid-nfc-format',            // 无效格式
        '04:GH:IJ:KL',                   // 包含非十六进制字符
        '4:1a:2b:3c'                     // 缺少前导零
    ],

    // 有效的域名后缀（会自动添加advx-前缀）
    VALID_DOMAINS: [
        'alice',                         // 简单字母
        'user123',                       // 字母+数字
        'test-user',                     // 包含连字符
        'a',                             // 最小长度1字符
        'verylongdomainnamebutvalid'     // 接近最大长度25字符
    ],

    // 无效的域名后缀
    INVALID_DOMAINS: [
        '',                              // 空字符串
        'A',                             // 大写字母
        '-user',                         // 开头连字符
        'user-',                         // 结尾连字符
        'user--name',                    // 连续连字符
        'user@name',                     // 特殊字符
        'verylongdomainnamebutvalidandtoolong' // 超过25字符
    ],

    // 小猫名称
    VALID_CAT_NAMES: [
        'Lucky Cat',
        'Whiskers',
        '小花',
        'Fluffy123',
        'Mr. Mittens'
    ],

    INVALID_CAT_NAMES: [
        '',                              // 空字符串
        'A'.repeat(101)                  // 超长名称
    ]
};

class InjectivePassTester {
    constructor() {
        this.client = axios.create({
            baseURL: CONFIG.BASE_URL,
            timeout: CONFIG.TIMEOUT,
            headers: { 'Content-Type': 'application/json' }
        });

        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: []
        };

        this.setupInterceptors();
    }

    setupInterceptors() {
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.code === 'ECONNREFUSED') {
                    console.error('❌ 无法连接到服务器，请确保后端服务在运行'.red);
                    process.exit(1);
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * 等待用户账户有足够余额（仅用于测试）
     */
    async waitForSufficientBalance(nfcUID, minimumAmount = '0.01', maxWaitTime = 20000) {
        const startTime = Date.now();
        console.log(`🔍 检查 NFC ${nfcUID} 的用户余额...`.yellow);

        while (Date.now() - startTime < maxWaitTime) {
            try {
                // 获取用户钱包信息
                const wallet = await this.apiCall('GET', `/api/nfc/wallet/${nfcUID}`);
                if (wallet && wallet.balance) {
                    const balance = parseFloat(wallet.balance.inj);
                    const minAmount = parseFloat(minimumAmount);

                    if (balance >= minAmount) {
                        console.log(`✅ 用户余额充足: ${balance} INJ >= ${minimumAmount} INJ`.green);
                        return true;
                    }

                    const elapsed = Math.round((Date.now() - startTime) / 1000);
                    console.log(`⏳ 余额不足: ${balance} INJ < ${minimumAmount} INJ，继续等待... (${elapsed}s)`.yellow);
                }
            } catch (error) {
                console.log(`⚠️ 检查余额失败，继续等待: ${error.message}`.yellow);
            }

            // 等待2秒后重试
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`❌ 等待余额超时 (${maxWaitTime / 1000}s)`.red);
        return false;
    }

    /**
     * 确保用户有足够余额进行操作（仅用于测试）
     */
    async ensureSufficientBalance(nfcUID, minimumAmount = '0.01') {
        console.log(`💰 确保用户 ${nfcUID} 有足够余额进行操作...`.cyan);

        // 首先检查当前余额
        try {
            const wallet = await this.apiCall('GET', `/api/nfc/wallet/${nfcUID}`);
            if (wallet && wallet.balance) {
                const balance = parseFloat(wallet.balance.inj);
                const minAmount = parseFloat(minimumAmount);

                if (balance >= minAmount) {
                    console.log(`✅ 余额充足，无需等待: ${balance} INJ`.green);
                    return true;
                }
            }
        } catch (error) {
            console.log(`⚠️ 获取余额失败: ${error.message}`.yellow);
        }

        // 如果余额不足，等待初始资金到账
        console.log(`💸 余额不足，等待初始资金到账...`.yellow);
        const success = await this.waitForSufficientBalance(nfcUID, minimumAmount);

        if (!success) {
            throw new Error(`用户 ${nfcUID} 余额不足，无法进行操作`);
        }

        return true;
    }

    async apiCall(method, endpoint, data = null, expectedStatus = 200) {
        const config = { method, url: endpoint };
        if (data) config.data = data;

        try {
            const response = await this.client(config);
            if (response.status !== expectedStatus) {
                throw new Error(`期望状态码 ${expectedStatus}，实际 ${response.status}`);
            }
            return response.data;
        } catch (error) {
            if (error.response) {
                // 如果是预期的错误状态码，返回响应数据
                if (error.response.status === expectedStatus) {
                    return error.response.data;
                }
                throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
            }
            throw error;
        }
    }

    async test(name, testFn, category = 'General') {
        const startTime = Date.now();
        try {
            console.log(`🧪 ${name}...`.cyan);
            const result = await testFn();
            const duration = Date.now() - startTime;

            console.log(`✅ ${name} - 通过 (${duration}ms)`.green);
            this.results.passed++;
            this.results.tests.push({
                name,
                category,
                status: 'passed',
                result,
                duration
            });
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ ${name} - 失败: ${error.message} (${duration}ms)`.red);
            this.results.failed++;
            this.results.tests.push({
                name,
                category,
                status: 'failed',
                error: error.message,
                duration
            });
            return null;
        }
    }

    async skip(name, reason, category = 'General') {
        console.log(`⏭️  ${name} - 跳过: ${reason}`.yellow);
        this.results.skipped++;
        this.results.tests.push({
            name,
            category,
            status: 'skipped',
            reason
        });
    }

    // 验证NFC UID格式
    validateNFCFormat(nfcUID) {
        if (!nfcUID || typeof nfcUID !== 'string') return false;
        if (nfcUID.length < CONFIG.CONSTRAINTS.NFC.MIN_LENGTH ||
            nfcUID.length > CONFIG.CONSTRAINTS.NFC.MAX_LENGTH) return false;

        return CONFIG.CONSTRAINTS.NFC.VALID_FORMATS.some(pattern => pattern.test(nfcUID));
    }

    // 验证域名格式
    validateDomainFormat(domainPrefix) {
        if (!domainPrefix || typeof domainPrefix !== 'string') return false;
        if (domainPrefix.length < CONFIG.CONSTRAINTS.DOMAIN.MIN_LENGTH ||
            domainPrefix.length > CONFIG.CONSTRAINTS.DOMAIN.MAX_LENGTH) return false;

        // 简化的验证：只检查基本字符集和长度
        const basicPattern = /^[a-z0-9]+([a-z0-9-]*[a-z0-9])*$/;
        if (!basicPattern.test(domainPrefix)) {
            // 如果不匹配复杂模式，检查是否为简单的单字符或数字字母组合
            const simplePattern = /^[a-z0-9]+$/;
            if (!simplePattern.test(domainPrefix)) return false;
        }

        // 检查禁止的模式
        for (const forbidden of CONFIG.CONSTRAINTS.DOMAIN.FORBIDDEN_PATTERNS) {
            if (forbidden && domainPrefix.includes(forbidden)) return false;
        }

        return true;
    }

    // 验证Injective地址格式
    validateInjectiveAddress(address) {
        return CONFIG.CONSTRAINTS.WALLET.ADDRESS_PATTERN.test(address);
    }

    async run() {
        console.log('🚀 Injective Pass 综合测试开始'.blue.bold);
        console.log('='.repeat(60).blue);

        // 阶段一：系统健康检查
        await this.runHealthChecks();

        // 阶段二：合约参数验证测试
        await this.runParameterValidationTests();

        // 阶段三：NFC系统核心功能测试
        await this.runNFCSystemTests();

        // 阶段四：域名系统测试
        await this.runDomainSystemTests();

        // 阶段五：小猫NFT系统测试
        await this.runCatNFTSystemTests();

        // 阶段六：集成测试
        await this.runIntegrationTests();

        // 阶段七：边界和错误处理测试
        await this.runBoundaryTests();

        // 输出测试结果
        this.printSummary();
    }

    async runHealthChecks() {
        console.log('\n📊 阶段一：系统健康检查'.blue.bold);
        console.log('-'.repeat(40).blue);

        await this.test('系统基础健康检查', async () => {
            const health = await this.apiCall('GET', '/health');
            if (health.status !== 'ok') throw new Error('健康检查失败');
            return health;
        }, 'Health');

        await this.test('API健康检查', async () => {
            const health = await this.apiCall('GET', '/api/health');
            if (health.status !== 'ok') throw new Error('API健康检查失败');
            return health;
        }, 'Health');

        await this.test('合约状态检查', async () => {
            const status = await this.apiCall('GET', '/api/contract/status');
            if (!status.nfcRegistry || !status.domainNFT || !status.catNFT) {
                throw new Error('部分合约未正确初始化');
            }
            return status;
        }, 'Health');

        await this.test('NFC统计数据查询', async () => {
            const stats = await this.apiCall('GET', '/api/nfc/stats');
            if (typeof stats.totalWallets !== 'number') {
                throw new Error('统计数据格式异常');
            }
            return stats;
        }, 'Health');
    }

    async runParameterValidationTests() {
        console.log('\n🔍 阶段二：合约参数验证测试'.blue.bold);
        console.log('-'.repeat(40).blue);

        // NFC UID 格式验证
        await this.test('NFC UID 有效格式验证', async () => {
            const validResults = TEST_DATA.VALID_NFCS.map(nfc => ({
                nfc,
                valid: this.validateNFCFormat(nfc)
            }));

            const allValid = validResults.every(result => result.valid);
            if (!allValid) {
                const invalid = validResults.filter(r => !r.valid);
                throw new Error(`以下有效NFC格式验证失败: ${invalid.map(r => r.nfc).join(', ')}`);
            }
            return validResults;
        }, 'Validation');

        await this.test('NFC UID 无效格式验证', async () => {
            const invalidResults = TEST_DATA.INVALID_NFCS.map(nfc => ({
                nfc,
                valid: this.validateNFCFormat(nfc)
            }));

            const anyValid = invalidResults.some(result => result.valid);
            if (anyValid) {
                const valid = invalidResults.filter(r => r.valid);
                throw new Error(`以下无效NFC格式意外通过验证: ${valid.map(r => r.nfc).join(', ')}`);
            }
            return invalidResults;
        }, 'Validation');

        // 域名格式验证
        await this.test('域名前缀有效格式验证', async () => {
            const validResults = TEST_DATA.VALID_DOMAINS.map(domain => ({
                domain,
                valid: this.validateDomainFormat(domain)
            }));

            const allValid = validResults.every(result => result.valid);
            if (!allValid) {
                const invalid = validResults.filter(r => !r.valid);
                throw new Error(`以下有效域名格式验证失败: ${invalid.map(r => r.domain).join(', ')}`);
            }
            return validResults;
        }, 'Validation');

        await this.test('域名前缀无效格式验证', async () => {
            const invalidResults = TEST_DATA.INVALID_DOMAINS.map(domain => ({
                domain,
                valid: this.validateDomainFormat(domain)
            }));

            const anyValid = invalidResults.some(result => result.valid);
            if (anyValid) {
                const valid = invalidResults.filter(r => r.valid);
                throw new Error(`以下无效域名格式意外通过验证: ${valid.map(r => r.domain).join(', ')}`);
            }
            return invalidResults;
        }, 'Validation');
    }

    async runNFCSystemTests() {
        console.log('\n💳 阶段三：NFC系统核心功能测试'.blue.bold);
        console.log('-'.repeat(40).blue);

        const testNFC = TEST_DATA.VALID_NFCS[0];

        await this.test('NFC卡片注册', async () => {
            const result = await this.apiCall('POST', '/api/nfc/register', {
                uid: testNFC,
                nickname: '测试卡片'
            });

            // 验证返回的钱包地址格式
            if (!this.validateInjectiveAddress(result.address)) {
                throw new Error(`无效的Injective地址格式: ${result.address}`);
            }

            // 验证初始资金状态
            if (!result.initialFunded) {
                throw new Error('新注册用户应该自动获得初始资金');
            }

            return result;
        }, 'NFC');

        await this.test('NFC钱包信息查询', async () => {
            const wallet = await this.apiCall('GET', `/api/nfc/wallet/${testNFC}`);

            if (!wallet.address || !this.validateInjectiveAddress(wallet.address)) {
                throw new Error('钱包地址无效或缺失');
            }

            if (!wallet.nfcCard || wallet.nfcCard.uid !== testNFC) {
                throw new Error('NFC卡片信息不匹配');
            }

            return wallet;
        }, 'NFC');

        await this.test('钱包余额查询', async () => {
            const wallet = await this.apiCall('GET', `/api/nfc/wallet/${testNFC}`);
            const balance = await this.apiCall('GET', `/api/nfc/balance/${wallet.address}`);

            // 验证余额格式
            if (typeof balance.inj !== 'string') {
                throw new Error('余额格式错误');
            }

            // 验证初始资金是否到账
            const balanceNum = parseFloat(balance.inj);
            if (balanceNum < 0.05) { // 至少应该有一些余额（考虑手续费）
                throw new Error(`余额过低，可能初始资金发送失败: ${balance.inj} INJ`);
            }

            return balance;
        }, 'NFC');

        await this.test('重复NFC注册处理', async () => {
            // 使用相同NFC再次注册，应该返回现有钱包信息
            const result = await this.apiCall('POST', '/api/nfc/register', {
                uid: testNFC,
                nickname: '重复测试卡片'
            });

            // 应该返回相同的地址
            const firstWallet = await this.apiCall('GET', `/api/nfc/wallet/${testNFC}`);
            if (result.address !== firstWallet.address) {
                throw new Error('重复注册返回了不同的钱包地址');
            }

            return result;
        }, 'NFC');
    }

    async runDomainSystemTests() {
        console.log('\n🌐 阶段四：域名系统测试'.blue.bold);
        console.log('-'.repeat(40).blue);

        const testNFC = TEST_DATA.VALID_NFCS[1]; // 使用不同的NFC
        const testDomain = 'testuser' + Date.now().toString().slice(-6); // 确保唯一性

        // 先注册NFC
        await this.test('域名测试NFC准备', async () => {
            return await this.apiCall('POST', '/api/nfc/register', {
                uid: testNFC,
                nickname: '域名测试卡片'
            });
        }, 'Domain');

        await this.test('域名可用性检查', async () => {
            const availability = await this.apiCall('GET', `/api/nfc/domain/check?domainPrefix=${testDomain}`);

            if (typeof availability.available !== 'boolean') {
                throw new Error('域名可用性检查返回格式错误');
            }

            if (!availability.available) {
                throw new Error('新生成的测试域名应该是可用的');
            }

            // 验证返回的完整域名格式
            const expectedDomain = `${CONFIG.CONSTRAINTS.DOMAIN.PREFIX}${testDomain}${CONFIG.CONSTRAINTS.DOMAIN.SUFFIX}`;
            if (availability.domain !== expectedDomain) {
                throw new Error(`域名格式不正确，期望: ${expectedDomain}, 实际: ${availability.domain}`);
            }

            return availability;
        }, 'Domain');

        await this.test('域名注册', async () => {
            const result = await this.apiCall('POST', '/api/nfc/domain/register', {
                uid: testNFC,
                domainPrefix: testDomain
            });

            // 验证域名格式
            const expectedDomain = `${CONFIG.CONSTRAINTS.DOMAIN.PREFIX}${testDomain}${CONFIG.CONSTRAINTS.DOMAIN.SUFFIX}`;
            if (result.domain !== expectedDomain) {
                throw new Error(`注册的域名格式不正确: ${result.domain}`);
            }

            // 验证交易哈希
            if (!result.txHash || !result.txHash.startsWith('0x')) {
                throw new Error('域名注册交易哈希无效');
            }

            return result;
        }, 'Domain');

        await this.test('重复域名注册检查', async () => {
            try {
                await this.apiCall('POST', '/api/nfc/domain/register', {
                    uid: testNFC,
                    domainPrefix: testDomain
                }, 409); // 期望冲突状态码

                throw new Error('重复域名注册应该被拒绝');
            } catch (error) {
                if (error.message.includes('重复域名注册应该被拒绝')) {
                    throw error;
                }
                // 其他错误是预期的
                return { message: '正确拒绝了重复域名注册' };
            }
        }, 'Domain');

        await this.test('无效域名前缀拒绝', async () => {
            const invalidDomain = TEST_DATA.INVALID_DOMAINS[0];

            try {
                await this.apiCall('POST', '/api/nfc/domain/register', {
                    uid: testNFC,
                    domainPrefix: invalidDomain
                }, 400); // 期望错误状态码

                return { message: '正确拒绝了无效域名前缀' };
            } catch (error) {
                throw new Error(`无效域名前缀"${invalidDomain}"应该被拒绝`);
            }
        }, 'Domain');
    }

    async runCatNFTSystemTests() {
        console.log('\n🐱 阶段五：小猫NFT系统测试'.blue.bold);
        console.log('-'.repeat(40).blue);

        const myNFC = TEST_DATA.VALID_NFCS[2];
        const otherNFC = TEST_DATA.VALID_NFCS[3];

        // 准备两个NFC用于社交互动测试
        await this.test('社交测试NFC准备 - 我的NFC', async () => {
            const result = await this.apiCall('POST', '/api/nfc/register', {
                uid: myNFC,
                nickname: '我的小猫卡片'
            });

            // 注册后等待3秒，让初始资金有时间到账
            console.log('  ⏳ 等待初始资金到账...'.yellow);
            await new Promise(resolve => setTimeout(resolve, 3000));

            return result;
        }, 'Cat');

        await this.test('社交测试NFC准备 - 其他NFC', async () => {
            const result = await this.apiCall('POST', '/api/nfc/register', {
                uid: otherNFC,
                nickname: '其他小猫卡片'
            });

            // 注册后等待3秒，让初始资金有时间到账
            console.log('  ⏳ 等待初始资金到账...'.yellow);
            await new Promise(resolve => setTimeout(resolve, 3000));

            return result;
        }, 'Cat');

        // 确保两个用户都有足够余额进行社交互动
        await this.test('确保用户余额充足', async () => {
            await this.ensureSufficientBalance(myNFC, '0.02');
            await this.ensureSufficientBalance(otherNFC, '0.02');
            return { message: '两个用户余额都已确认充足' };
        }, 'Cat');

        await this.test('抽卡统计初始状态', async () => {
            const stats = await this.apiCall('GET', `/api/nfc/draw-stats/${myNFC}`);

            // 新用户应该没有可用抽卡次数
            if (stats.availableDraws !== 0) {
                throw new Error(`新用户应该没有可用抽卡次数，实际: ${stats.availableDraws}`);
            }

            return stats;
        }, 'Cat');

        await this.test('社交互动获取抽卡机会', async () => {
            const result = await this.apiCall('POST', '/api/nfc/social-interaction', {
                myNFC: myNFC,
                otherNFC: otherNFC
            });

            // 验证奖励的抽卡次数
            if (!result.rewardTickets || result.rewardTickets < 1) {
                throw new Error('社交互动应该奖励至少1次抽卡机会');
            }

            // 验证交易哈希
            if (!result.txHash || !result.txHash.startsWith('0x')) {
                throw new Error('社交互动交易哈希无效');
            }

            return result;
        }, 'Cat');

        await this.test('抽卡统计更新验证', async () => {
            const stats = await this.apiCall('GET', `/api/nfc/draw-stats/${myNFC}`);

            // 社交互动后应该有可用抽卡次数
            if (stats.availableDraws < 1) {
                throw new Error(`社交互动后应该有可用抽卡次数，实际: ${stats.availableDraws}`);
            }

            return stats;
        }, 'Cat');

        await this.test('使用抽卡券抽取小猫NFT', async () => {
            const catName = TEST_DATA.VALID_CAT_NAMES[0];

            const result = await this.apiCall('POST', '/api/nfc/draw-cat-with-tickets', {
                nfcUid: myNFC,
                catName: catName
            });

            // 验证抽卡结果
            if (!result.tokenId) {
                throw new Error('抽卡应该返回tokenId');
            }

            if (!CONFIG.CONSTRAINTS.CAT.RARITIES.includes(result.rarity)) {
                throw new Error(`无效的稀有度: ${result.rarity}`);
            }

            if (!result.color) {
                throw new Error('抽卡应该返回颜色信息');
            }

            // 验证交易哈希
            if (!result.txHash || !result.txHash.startsWith('0x')) {
                throw new Error('抽卡交易哈希无效');
            }

            return result;
        }, 'Cat');

        await this.test('用户小猫NFT列表查询', async () => {
            const catList = await this.apiCall('GET', `/api/nfc/cat/list/${myNFC}`);

            if (!Array.isArray(catList.cats)) {
                throw new Error('小猫列表应该是数组格式');
            }

            if (catList.cats.length === 0) {
                throw new Error('抽卡后应该有至少一只小猫');
            }

            // 验证小猫信息格式
            const cat = catList.cats[0];
            if (!cat.tokenId || !cat.name || !cat.rarity || !cat.color) {
                throw new Error('小猫信息格式不完整');
            }

            return catList;
        }, 'Cat');

        await this.test('重复社交互动检查', async () => {
            try {
                await this.apiCall('POST', '/api/nfc/social-interaction', {
                    myNFC: myNFC,
                    otherNFC: otherNFC
                }, 400); // 期望错误状态码

                return { message: '正确拒绝了重复社交互动' };
            } catch (error) {
                throw new Error('重复社交互动应该被拒绝');
            }
        }, 'Cat');
    }

    async runIntegrationTests() {
        console.log('\n🔗 阶段六：集成测试'.blue.bold);
        console.log('-'.repeat(40).blue);

        const integrationNFC = '04:99:88:77:66:55:44';
        const integrationDomain = 'integration' + Date.now().toString().slice(-6);

        await this.test('端到端用户旅程测试', async () => {
            // 1. 注册NFC
            const registration = await this.apiCall('POST', '/api/nfc/register', {
                uid: integrationNFC,
                nickname: '集成测试卡片'
            });

            // 2. 注册域名
            const domainReg = await this.apiCall('POST', '/api/nfc/domain/register', {
                uid: integrationNFC,
                domainPrefix: integrationDomain
            });

            // 3. 验证用户资料
            const profile = await this.apiCall('GET', `/api/user/profile/${integrationNFC}`);

            // 验证完整用户旅程
            if (!this.validateInjectiveAddress(registration.address)) {
                throw new Error('用户旅程 - 钱包地址无效');
            }

            if (!domainReg.domain.includes(integrationDomain)) {
                throw new Error('用户旅程 - 域名注册失败');
            }

            if (profile.nfcUID !== integrationNFC) {
                throw new Error('用户旅程 - 用户资料不匹配');
            }

            return {
                registration,
                domainReg,
                profile
            };
        }, 'Integration');

        await this.test('数据一致性验证', async () => {
            // 从不同接口获取用户信息，验证数据一致性
            const wallet = await this.apiCall('GET', `/api/nfc/wallet/${integrationNFC}`);
            const profile = await this.apiCall('GET', `/api/user/profile/${integrationNFC}`);
            const stats = await this.apiCall('GET', '/api/nfc/stats');

            // 验证地址一致性
            if (wallet.address !== profile.walletAddress) {
                throw new Error('钱包地址数据不一致');
            }

            // 验证域名一致性
            if (wallet.domain !== profile.domain) {
                throw new Error('域名数据不一致');
            }

            // 验证统计数据增长
            if (typeof stats.totalWallets !== 'number' || stats.totalWallets < 1) {
                throw new Error('统计数据异常');
            }

            return { wallet, profile, stats };
        }, 'Integration');
    }

    async runBoundaryTests() {
        console.log('\n🔥 阶段七：边界和错误处理测试'.blue.bold);
        console.log('-'.repeat(40).blue);

        await this.test('无效NFC格式请求处理', async () => {
            const invalidNFC = TEST_DATA.INVALID_NFCS[0];

            try {
                await this.apiCall('POST', '/api/nfc/register', {
                    uid: invalidNFC,
                    nickname: '无效测试'
                }, 400);

                return { message: '正确拒绝了无效NFC格式' };
            } catch (error) {
                throw new Error(`无效NFC格式"${invalidNFC}"应该被拒绝`);
            }
        }, 'Boundary');

        await this.test('不存在资源查询处理', async () => {
            const nonExistentNFC = '04:00:00:00:00:00:00';

            try {
                await this.apiCall('GET', `/api/nfc/wallet/${nonExistentNFC}`, null, 404);
                return { message: '正确返回404状态' };
            } catch (error) {
                throw new Error('不存在的NFC查询应该返回404状态');
            }
        }, 'Boundary');

        await this.test('长字符串输入处理', async () => {
            const longNickname = 'A'.repeat(1000); // 超长昵称
            const testNFC = '04:AA:BB:CC:DD:EE:FF';

            try {
                await this.apiCall('POST', '/api/nfc/register', {
                    uid: testNFC,
                    nickname: longNickname
                }, 400);

                return { message: '正确拒绝了超长输入' };
            } catch (error) {
                // 如果服务器处理了请求但限制了长度，也是可接受的
                if (error.message.includes('HTTP 200')) {
                    return { message: '服务器处理了超长输入（已截断）' };
                }
                throw new Error('超长输入应该被适当处理');
            }
        }, 'Boundary');

        await this.test('缺失必要参数处理', async () => {
            try {
                await this.apiCall('POST', '/api/nfc/register', {
                    // 故意缺少uid参数
                    nickname: '测试'
                }, 400);

                return { message: '正确拒绝了缺失参数的请求' };
            } catch (error) {
                throw new Error('缺失必要参数的请求应该被拒绝');
            }
        }, 'Boundary');

        await this.test('并发请求处理', async () => {
            const concurrentNFC = '04:CC:CC:CC:CC:CC:CC';

            // 发送多个并发请求
            const promises = Array(5).fill().map((_, index) =>
                this.apiCall('POST', '/api/nfc/register', {
                    uid: concurrentNFC,
                    nickname: `并发测试${index}`
                }).catch(error => ({ error: error.message }))
            );

            const results = await Promise.all(promises);

            // 至少有一个成功，其他应该返回一致的结果
            const successful = results.filter(r => !r.error);
            if (successful.length === 0) {
                throw new Error('并发请求应该至少有一个成功');
            }

            // 所有成功的请求应该返回相同的地址
            const addresses = successful.map(r => r.address);
            const uniqueAddresses = [...new Set(addresses)];
            if (uniqueAddresses.length !== 1) {
                throw new Error('并发请求返回了不同的钱包地址');
            }

            return { successful: successful.length, total: results.length };
        }, 'Boundary');
    }

    printSummary() {
        const total = this.results.passed + this.results.failed + this.results.skipped;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

        console.log('\n' + '='.repeat(60).blue.bold);
        console.log('📊 Injective Pass 综合测试结果'.blue.bold);
        console.log('='.repeat(60).blue.bold);

        console.log(`✅ 通过: ${this.results.passed}`.green);
        console.log(`❌ 失败: ${this.results.failed}`.red);
        console.log(`⏭️  跳过: ${this.results.skipped}`.yellow);
        console.log(`📊 总计: ${total}`);
        console.log(`🎯 成功率: ${successRate}%`);

        // 按类别统计
        const categories = {};
        this.results.tests.forEach(test => {
            if (!categories[test.category]) {
                categories[test.category] = { passed: 0, failed: 0, skipped: 0 };
            }
            categories[test.category][test.status]++;
        });

        console.log('\n📋 分类统计:');
        Object.entries(categories).forEach(([category, stats]) => {
            const categoryTotal = stats.passed + stats.failed + stats.skipped;
            const categoryRate = categoryTotal > 0 ? ((stats.passed / categoryTotal) * 100).toFixed(1) : 0;
            console.log(`  ${category}: ${stats.passed}/${categoryTotal} (${categoryRate}%)`);
        });

        // 失败详情
        if (this.results.failed > 0) {
            console.log('\n❌ 失败详情:'.red.bold);
            this.results.tests
                .filter(t => t.status === 'failed')
                .forEach(t => console.log(`  - ${t.name}: ${t.error}`.red));
        }

        // 性能统计
        const durations = this.results.tests
            .filter(t => t.duration)
            .map(t => t.duration);

        if (durations.length > 0) {
            const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2);
            const maxDuration = Math.max(...durations);
            console.log(`\n⏱️  平均响应时间: ${avgDuration}ms`);
            console.log(`⏱️  最长响应时间: ${maxDuration}ms`);
        }

        // 最终结果
        if (this.results.failed === 0) {
            console.log('\n🎉 所有测试通过！系统运行正常！'.green.bold);
        } else {
            console.log('\n⚠️  部分测试失败，请检查上述问题！'.red.bold);
        }

        console.log('='.repeat(60).blue.bold);

        // 退出码
        process.exit(this.results.failed > 0 ? 1 : 0);
    }
}

// 执行测试
async function main() {
    try {
        const tester = new InjectivePassTester();
        await tester.run();
    } catch (error) {
        console.error('💥 测试执行发生致命错误:'.red.bold, error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = InjectivePassTester;
