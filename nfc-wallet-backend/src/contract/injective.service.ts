import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Wallet, Contract, JsonRpcProvider, parseEther, formatEther } from 'ethers';
import {
    PrivateKey,
    TxRestApi,
    ChainRestAuthApi,
    ChainRestBankApi,
    createTransaction,
    MsgSend,
    getInjectiveAddress,
    getEthereumAddress,
    BaseAccount,
    DEFAULT_STD_FEE,
    SIGN_AMINO,
    MsgBroadcasterWithPk
} from '@injectivelabs/sdk-ts';
import { BigNumberInWei, BigNumberInBase } from '@injectivelabs/utils';
import { Network, getNetworkEndpoints } from '@injectivelabs/networks';
import * as path from 'path';
import * as fs from 'fs';

// 安全加载ABI文件的函数
function loadABI(filename: string): any[] {
    try {
        const abiPath = path.join(__dirname, './abis', filename);
        const abiContent = fs.readFileSync(abiPath, 'utf8');
        const parsed = JSON.parse(abiContent);
        return parsed.abi || parsed; // 支持两种格式
    } catch (error) {
        console.error(`Failed to load ABI from ${filename}:`, error);
        return []; // 返回空数组作为fallback
    }
}

// 合约 ABI 常量
const NFCWalletRegistryABI = loadABI('NFCWalletRegistry.json');
const INJDomainNFTABI = loadABI('INJDomainNFT.json');
const CatNFTABI = loadABI('CatNFT_SocialDraw.json');

@Injectable()
export class InjectiveService {
    private readonly masterPrivateKey: string;
    private readonly network: Network;
    private readonly endpoints: any;
    private readonly evmProvider: JsonRpcProvider;
    private readonly evmWallet: Wallet;

    // 合约实例
    private nfcRegistryContract: Contract;
    private domainNFTContract: Contract;
    private catNFTContract: Contract;

    constructor(private configService: ConfigService) {
        this.masterPrivateKey = this.configService.get<string>('CONTRACT_PRIVATE_KEY');
        this.network = this.configService.get<string>('NODE_ENV') === 'production'
            ? Network.Mainnet
            : Network.TestnetSentry;
        this.endpoints = getNetworkEndpoints(this.network);

        // 初始化 EVM provider 和 wallet
        const rpcUrl = this.configService.get<string>('INJECTIVE_RPC_URL');
        this.evmProvider = new JsonRpcProvider(rpcUrl);
        this.evmWallet = new Wallet(this.masterPrivateKey, this.evmProvider);

        // 初始化合约实例
        this.initializeContracts();
    }

    /**
     * 初始化合约实例
     */
    private initializeContracts() {
        try {
            const nfcRegistryAddress = this.configService.get<string>('NFC_REGISTRY_ADDRESS');
            const domainRegistryAddress = this.configService.get<string>('DOMAIN_REGISTRY_ADDRESS');
            const catNFTAddress = this.configService.get<string>('CAT_NFT_ADDRESS');

            if (nfcRegistryAddress) {
                this.nfcRegistryContract = new Contract(
                    nfcRegistryAddress,
                    NFCWalletRegistryABI,
                    this.evmWallet
                );
                console.log(`NFCWalletRegistry 合约初始化成功: ${nfcRegistryAddress}`);
            }

            if (domainRegistryAddress) {
                this.domainNFTContract = new Contract(
                    domainRegistryAddress,
                    INJDomainNFTABI,
                    this.evmWallet
                );
                console.log(`INJDomainNFT 合约初始化成功: ${domainRegistryAddress}`);
            }

            if (catNFTAddress) {
                this.catNFTContract = new Contract(
                    catNFTAddress,
                    CatNFTABI,
                    this.evmWallet
                );
                console.log(`CatNFT 合约初始化成功: ${catNFTAddress}`);
            }
        } catch (error) {
            console.error('合约初始化失败:', error);
        }
    }

    /**
     * 检测并绑定空白NFC卡片（新用户注册时调用）
     */
    async detectAndBindBlankCard(
        nfcUID: string,
        userWalletAddress: string
    ): Promise<{ success: boolean; txHash?: string; error?: string }> {
        try {
            if (!this.nfcRegistryContract) {
                throw new Error('NFCWalletRegistry合约未初始化');
            }

            console.log(`开始绑定空白NFC卡片: ${nfcUID} -> ${userWalletAddress}`);

            // 调用合约的detectAndBindBlankCard方法
            const tx = await this.nfcRegistryContract.detectAndBindBlankCard(
                nfcUID,
                userWalletAddress,
                {
                    gasLimit: 500000,
                    gasPrice: parseEther('0.00000002') // 20 gwei
                }
            );

            console.log(`NFC绑定交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`NFC绑定成功: ${nfcUID} -> ${userWalletAddress}, 交易哈希: ${tx.hash}`);
                return {
                    success: true,
                    txHash: tx.hash
                };
            } else {
                throw new Error('交易失败');
            }
        } catch (error) {
            console.error('NFC绑定失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 检查NFC是否已绑定
     */
    async isNFCBound(nfcUID: string): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract) {
                return false;
            }

            return await this.nfcRegistryContract.isNFCBound(nfcUID);
        } catch (error) {
            console.error('检查NFC绑定状态失败:', error);
            return false;
        }
    }

    /**
     * 获取NFC绑定信息
     */
    async getNFCBinding(nfcUID: string): Promise<{
        walletAddress: string;
        boundAt: number;
        unboundAt: number;
        isActive: boolean;
        isBlank: boolean;
        metadata: string;
    } | null> {
        try {
            if (!this.nfcRegistryContract) {
                return null;
            }

            const binding = await this.nfcRegistryContract.getNFCBinding(nfcUID);

            return {
                walletAddress: binding[0],
                boundAt: Number(binding[1]),
                unboundAt: Number(binding[2]),
                isActive: binding[3],
                isBlank: binding[4],
                metadata: binding[5]
            };
        } catch (error) {
            console.error('获取NFC绑定信息失败:', error);
            return null;
        }
    }

    /**
     * 获取正确的Chain ID
     */
    private getChainId(): string {
        // Injective Testnet 的正确 chain-id 是 'injective-888'
        // Mainnet 的 chain-id 是 'injective-1'
        return this.network === Network.Mainnet ? 'injective-1' : 'injective-888';
    }

    /**
     * 根据私钥生成Injective钱包信息
     */
    generateInjectiveWallet(): {
        privateKey: string;
        address: string;
        ethAddress: string;
        publicKey: string;
    } {
        try {
            // 生成以太坊兼容的私钥
            const ethWallet = Wallet.createRandom();

            // 使用Injective SDK处理地址转换
            const privateKeyObj = PrivateKey.fromPrivateKey(ethWallet.privateKey);
            const publicKey = privateKeyObj.toPublicKey();
            const address = publicKey.toAddress();

            return {
                privateKey: ethWallet.privateKey,
                address: address.toBech32(), // Injective地址 (inj...)
                ethAddress: ethWallet.address, // 以太坊格式地址
                publicKey: publicKey.toBase64()
            };
        } catch (error) {
            console.error('Error generating Injective wallet:', error);
            throw new Error('Failed to generate Injective wallet');
        }
    }

    /**
     * 从私钥恢复Injective钱包信息
     */
    getWalletFromPrivateKey(privateKeyHex: string): {
        address: string;
        ethAddress: string;
        publicKey: string;
    } {
        try {
            const privateKeyObj = PrivateKey.fromPrivateKey(privateKeyHex);
            const publicKey = privateKeyObj.toPublicKey();
            const address = publicKey.toAddress();

            return {
                address: address.toBech32(),
                ethAddress: address.toHex(),
                publicKey: publicKey.toBase64()
            };
        } catch (error) {
            console.error('Error recovering wallet from private key:', error);
            throw new Error('Failed to recover wallet from private key');
        }
    }

    /**
     * 地址格式转换
     */
    convertAddresses(input: string): {
        injectiveAddress: string;
        ethereumAddress: string;
    } {
        try {
            if (input.startsWith('inj')) {
                return {
                    injectiveAddress: input,
                    ethereumAddress: getEthereumAddress(input)
                };
            } else if (input.startsWith('0x')) {
                return {
                    injectiveAddress: getInjectiveAddress(input),
                    ethereumAddress: input
                };
            } else {
                throw new Error('Invalid address format');
            }
        } catch (error) {
            console.error('Error converting addresses:', error);
            throw new Error('Failed to convert address format');
        }
    }

    /**
     * 发送初始资金给新用户
     */
    async sendInitialFunds(
        recipientAddress: string,
        amount: string = '0.1'
    ): Promise<{ success: boolean; txHash?: string; error?: string }> {
        try {
            console.log(`开始发送初始资金: ${amount} INJ -> ${recipientAddress}`);

            // 检查主账户余额
            const masterAddress = this.getWalletFromPrivateKey(this.masterPrivateKey).address;
            const masterBalance = await this.getAccountBalance(masterAddress);
            const requiredAmount = new BigNumberInBase(amount);

            if (new BigNumberInBase(masterBalance.inj).lt(requiredAmount)) {
                return {
                    success: false,
                    error: `主账户余额不足: ${masterBalance.inj} INJ, 需要: ${amount} INJ`
                };
            }

            // 创建MsgSend消息
            const msg = MsgSend.fromJSON({
                amount: {
                    denom: 'inj',
                    amount: new BigNumberInBase(amount).toWei().toFixed()
                },
                srcInjectiveAddress: masterAddress,
                dstInjectiveAddress: recipientAddress
            });

            // 使用MsgBroadcasterWithPk发送交易
            const broadcaster = new MsgBroadcasterWithPk({
                privateKey: this.masterPrivateKey,
                network: this.network,
                endpoints: this.endpoints
            });

            const txResponse = await broadcaster.broadcast({
                msgs: msg
            });

            if (txResponse.code === 0) {
                console.log(`初始资金发送成功: ${recipientAddress}, tx: ${txResponse.txHash}`);
                return {
                    success: true,
                    txHash: txResponse.txHash
                };
            } else {
                console.error(`初始资金发送失败: ${txResponse.rawLog}`);
                return {
                    success: false,
                    error: `交易失败: ${txResponse.rawLog}`
                };
            }
        } catch (error) {
            console.error('发送初始资金失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 发送INJ代币
     */
    async sendInjectiveTokens(
        toAddress: string,
        amount: string, // INJ数量，例如 "0.1"
        fromPrivateKey?: string // 如果不提供，使用主账户私钥
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any }> {
        try {
            const privateKey = fromPrivateKey || this.masterPrivateKey;

            // 检查主账户余额
            const masterAddress = this.getWalletFromPrivateKey(privateKey).address;
            const masterBalance = await this.getAccountBalance(masterAddress);
            const requiredAmount = new BigNumberInBase(amount);

            if (new BigNumberInBase(masterBalance.inj).lt(requiredAmount)) {
                return {
                    success: false,
                    error: `主账户余额不足: ${masterBalance.inj} INJ, 需要: ${amount} INJ`
                };
            }

            // 规范化接收地址：支持 inj 或 0x，银行模块要求 inj(bech32)
            const normalizedDst = toAddress.startsWith('inj') ? toAddress : getInjectiveAddress(toAddress);

            // 创建MsgSend消息
            const msg = MsgSend.fromJSON({
                amount: {
                    denom: 'inj',
                    amount: new BigNumberInBase(amount).toWei().toFixed()
                },
                srcInjectiveAddress: masterAddress,
                dstInjectiveAddress: normalizedDst
            });

            // 使用MsgBroadcasterWithPk发送交易
            const broadcaster = new MsgBroadcasterWithPk({
                privateKey: privateKey,
                network: this.network,
                endpoints: this.endpoints
            });

            const txResponse = await broadcaster.broadcast({
                msgs: msg
            });

            if (txResponse.code === 0) {
                return {
                    success: true,
                    txHash: txResponse.txHash,
                    rawTx: {
                        type: 'SEND',
                        from: masterAddress,
                        to: normalizedDst,
                        amount: amount,
                        denom: 'inj',
                        txHash: txResponse.txHash,
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                return {
                    success: false,
                    error: `交易失败: ${txResponse.rawLog}`
                };
            }
        } catch (error) {
            console.error('发送INJ代币失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取账户余额
 */
    async getAccountBalance(address: string): Promise<{
        inj: string;
        usd?: string;
    }> {
        try {
            const injectiveAddress = address.startsWith('inj')
                ? address
                : getInjectiveAddress(address);

            // 使用 ChainRestBankApi 来获取余额
            const chainRestBankApi = new ChainRestBankApi(this.endpoints.rest);
            const balancesResponse = await chainRestBankApi.fetchBalances(injectiveAddress);

            // 查找 INJ 余额
            const injBalance = balancesResponse.balances.find(balance => balance.denom === 'inj');
            const balance = injBalance ? injBalance.amount : '0';

            const injBalanceFormatted = new BigNumberInWei(balance).toFixed(6);

            return {
                inj: injBalanceFormatted
            };
        } catch (error) {
            console.error('Error getting account balance:', error);
            return {
                inj: '0.000000'
            };
        }
    }

    /**
     * 准备交易数据（用于前端签名）
     */
    async prepareTransaction(
        fromAddress: string,
        toAddress: string,
        amount: string,
        memo: string = ''
    ): Promise<any> {
        try {
            const senderAddress = fromAddress.startsWith('inj')
                ? fromAddress
                : getInjectiveAddress(fromAddress);
            const recipientAddress = toAddress.startsWith('inj')
                ? toAddress
                : getInjectiveAddress(toAddress);

            // 获取账户信息
            const chainRestAuthApi = new ChainRestAuthApi(this.endpoints.rest);
            const accountDetailsResponse = await chainRestAuthApi.fetchAccount(senderAddress);
            const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

            // 创建发送消息 - 转换INJ到Wei格式（1 INJ = 10^18 Wei）
            const amount_wei = new BigNumberInBase(amount).toWei().toFixed();

            const msg = MsgSend.fromJSON({
                amount: {
                    amount: amount_wei,
                    denom: 'inj'
                },
                srcInjectiveAddress: senderAddress,
                dstInjectiveAddress: recipientAddress
            });

            return {
                msg,
                accountNumber: baseAccount.accountNumber,
                sequence: baseAccount.sequence,
                chainId: this.getChainId()
            };

        } catch (error) {
            console.error('Error preparing transaction:', error);
            throw new Error('Failed to prepare transaction');
        }
    }

    /**
     * 广播已签名的交易
     */
    async broadcastTransaction(signedTxData: any): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }> {
        try {
            const txRestApi = new TxRestApi(this.endpoints.rest);
            const txResponse = await txRestApi.broadcast(signedTxData);

            if (txResponse.code !== 0) {
                throw new Error(`Transaction failed: ${txResponse.rawLog}`);
            }

            return {
                success: true,
                txHash: txResponse.txHash
            };

        } catch (error) {
            console.error('Error broadcasting transaction:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 验证Injective地址格式
     */
    isValidInjectiveAddress(address: string): boolean {
        try {
            return address.startsWith('inj') && address.length === 42;
        } catch {
            return false;
        }
    }

    /**
     * 获取网络信息
     */
    getNetworkInfo(): {
        network: string;
        chainId: string;
        rpcUrl: string;
        restUrl: string;
    } {
        return {
            network: this.network,
            chainId: this.getChainId(),
            rpcUrl: this.endpoints.grpc,
            restUrl: this.endpoints.rest
        };
    }

    /**
     * 铸造域名NFT (与NFC绑定)
     */
    async mintDomainNFT(
        ownerAddress: string,
        domainName: string,
        nfcUID: string,
        tokenId: string,
        userPrivateKey: string // 新增：用户私钥
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any }> {
        try {
            if (!this.domainNFTContract) {
                throw new Error('域名NFT合约未初始化');
            }

            // 提取域名后缀（移除advx-前缀和.inj后缀）
            // 合约期望的是domainSuffix，会自动添加advx-前缀
            let domainSuffix = domainName.replace('.inj', ''); // 移除.inj
            if (domainSuffix.startsWith('advx-')) {
                domainSuffix = domainSuffix.replace('advx-', ''); // 移除advx-前缀
            }

            // 调用合约的mintDomainNFT方法
            console.log(`开始铸造域名NFT: ${domainName} -> ${ownerAddress}, NFC: ${nfcUID}, 域名后缀: ${domainSuffix}`);

            // 使用用户私钥创建合约实例
            const userWallet = new Wallet(userPrivateKey, this.evmProvider);
            const userDomainNFTContract = new Contract(
                this.configService.get<string>('DOMAIN_REGISTRY_ADDRESS'),
                INJDomainNFTABI,
                userWallet
            );

            const tx = await userDomainNFTContract.mintDomainNFT(
                domainSuffix,  // 传递纯后缀，合约会自动添加advx-前缀
                nfcUID,
                '', // metadataURI 可以为空
                {
                    gasLimit: 500000,
                    gasPrice: parseEther('0.00000002'), // 20 gwei
                    value: 0 // registrationFee 设置为0
                }
            );

            console.log(`域名NFT铸造交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`域名NFT铸造成功: ${domainName} -> ${ownerAddress}, 交易哈希: ${tx.hash}`);

                return {
                    success: true,
                    txHash: tx.hash,
                    rawTx: {
                        type: 'DOMAIN_NFT_MINT',
                        domain: domainName,
                        nfcUID: nfcUID,
                        tokenId: tokenId,
                        owner: ownerAddress,
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                throw new Error('交易失败');
            }
        } catch (error) {
            console.error('域名NFT铸造失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 铸造小猫NFT (抽卡)
     */
    async mintCatNFT(
        ownerAddress: string,
        catName: string
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any; rarity?: string; color?: string }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            console.log(`开始小猫NFT抽卡: ${catName} -> ${ownerAddress}`);

            // 调用合约的drawCatNFT方法
            const tx = await this.catNFTContract.drawCatNFT(catName, {
                gasLimit: 500000,
                gasPrice: parseEther('0.00000002'), // 20 gwei
                value: parseEther('0.1') // 抽卡费用 0.1 INJ
            });

            console.log(`小猫NFT抽卡交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`小猫NFT抽卡成功: ${catName} -> ${ownerAddress}, 交易哈希: ${tx.hash}`);

                // 解析事件获取NFT信息
                let rarity = 'R'; // 默认稀有度
                let color = 'black'; // 默认颜色
                let tokenId = '';

                // 查找CatNFTMinted事件
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = this.catNFTContract.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'CatNFTMinted') {
                            tokenId = parsedLog.args.tokenId.toString();
                            const rarityIndex = parsedLog.args.rarity;
                            color = parsedLog.args.color;

                            // 转换稀有度枚举
                            const rarityMap = ['R', 'SR', 'SSR', 'UR'];
                            rarity = rarityMap[rarityIndex] || 'R';
                            break;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }

                return {
                    success: true,
                    txHash: tx.hash,
                    rarity,
                    color,
                    rawTx: {
                        type: 'CAT_NFT_MINT',
                        name: catName,
                        tokenId: tokenId,
                        rarity: rarity,
                        color: color,
                        owner: ownerAddress,
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                throw new Error('交易失败');
            }
        } catch (error) {
            console.error('小猫NFT抽卡失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 社交互动
     */
    async socialInteraction(
        myNFC: string,
        otherNFC: string,
        userPrivateKey: string // 新增：用户私钥
    ): Promise<{ success: boolean; txHash?: string; error?: string; rewardTickets?: number; totalTickets?: number }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            console.log(`开始社交互动: ${myNFC} 与 ${otherNFC}`);

            // 使用用户私钥创建合约实例
            const userWallet = new Wallet(userPrivateKey, this.evmProvider);
            const userCatNFTContract = new Contract(
                this.configService.get<string>('CAT_NFT_ADDRESS'),
                CatNFTABI,
                userWallet
            );

            // 调用合约的socialInteraction方法
            const tx = await userCatNFTContract.socialInteraction(
                myNFC,
                otherNFC,
                {
                    gasLimit: 500000,
                    gasPrice: parseEther('0.00000002') // 20 gwei
                }
            );

            console.log(`社交互动交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`社交互动成功: ${myNFC} 与 ${otherNFC}, 交易哈希: ${tx.hash}`);

                // 解析事件获取奖励信息
                let rewardTickets = 1; // 默认奖励1张票
                let totalTickets = 1;

                // 查找SocialInteractionCompleted事件
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = userCatNFTContract.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'SocialInteractionCompleted') {
                            rewardTickets = parsedLog.args.rewardedDraws?.toNumber() || 1;
                            totalTickets = parsedLog.args.totalDrawsAvailable?.toNumber() || 1;
                            break;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }

                return {
                    success: true,
                    txHash: tx.hash,
                    rewardTickets,
                    totalTickets
                };
            } else {
                throw new Error('交易失败');
            }
        } catch (error) {
            console.error('社交互动失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 检查用户在CatNFT合约中的授权状态
     */
    async checkUserAuthorization(userAddress: string): Promise<boolean> {
        try {
            if (!this.catNFTContract) {
                return false;
            }

            const isAuthorized = await this.catNFTContract.authorizedOperators(userAddress);
            console.log(`用户 ${userAddress} 授权状态: ${isAuthorized}`);
            return isAuthorized;
        } catch (error) {
            console.error('检查用户授权状态失败:', error);
            return false;
        }
    }

    /**
     * 手动授权用户为CatNFT合约操作者
     */
    async authorizeUser(userAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('CatNFT合约未初始化');
            }

            console.log(`开始手动授权用户: ${userAddress}`);

            // 使用合约拥有者身份进行授权
            const tx = await this.catNFTContract.setAuthorizedOperator(
                userAddress,
                true,
                {
                    gasLimit: 100000,
                    gasPrice: parseEther('0.00000002') // 20 gwei
                }
            );

            console.log(`用户授权交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`用户授权成功: ${userAddress}, 交易哈希: ${tx.hash}`);
                return {
                    success: true,
                    txHash: tx.hash
                };
            } else {
                throw new Error('授权交易失败');
            }
        } catch (error) {
            console.error('用户授权失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 使用抽卡券抽取猫咪NFT
     */
    async drawCatNFTWithTickets(
        ownerAddress: string,
        nfcUID: string,
        catName: string,
        userPrivateKey: string // 新增：用户私钥
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any; rarity?: string; color?: string; drawCount?: number }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            console.log(`开始使用抽卡券抽取: ${catName} -> ${ownerAddress}, NFC: ${nfcUID}`);

            // 使用用户私钥创建合约实例
            const userWallet = new Wallet(userPrivateKey, this.evmProvider);
            const userCatNFTContract = new Contract(
                this.configService.get<string>('CAT_NFT_ADDRESS'),
                CatNFTABI,
                userWallet
            );

            // 调用合约的drawCatNFTWithTickets方法
            const tx = await userCatNFTContract.drawCatNFTWithTickets(
                nfcUID,
                catName,
                {
                    gasLimit: 700000,
                    gasPrice: parseEther('0.00000002'), // 20 gwei
                    value: parseEther('0.1') // 手续费 0.1 INJ
                }
            );

            console.log(`抽卡交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`抽卡成功: ${catName} -> ${ownerAddress}, 交易哈希: ${tx.hash}`);

                // 解析事件获取NFT信息
                let rarity = 'R';
                let color = '黑色';
                let tokenId = '';
                let drawCount = 0;

                // 优先查找CatDrawnWithTickets事件，如果没有则查找CatNFTMinted事件
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = userCatNFTContract.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'CatDrawnWithTickets') {
                            tokenId = parsedLog.args.tokenId.toString();
                            const rarityIndex = parsedLog.args.rarity;
                            color = parsedLog.args.color;
                            drawCount = parsedLog.args.remainingTickets?.toNumber() || 0;

                            // 转换稀有度枚举
                            const rarityMap = ['R', 'SR', 'SSR', 'UR'];
                            rarity = rarityMap[rarityIndex] || 'R';
                            break;
                        } else if (parsedLog && parsedLog.name === 'CatNFTMinted') {
                            tokenId = parsedLog.args.tokenId.toString();
                            const rarityIndex = parsedLog.args.rarity;
                            color = parsedLog.args.color;

                            // 转换稀有度枚举
                            const rarityMap = ['R', 'SR', 'SSR', 'UR'];
                            rarity = rarityMap[rarityIndex] || 'R';
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }

                return {
                    success: true,
                    txHash: tx.hash,
                    rarity,
                    color,
                    drawCount,
                    rawTx: {
                        type: 'CAT_NFT_TICKET_MINT',
                        name: catName,
                        tokenId: tokenId,
                        rarity: rarity,
                        color: color,
                        owner: ownerAddress,
                        nfcUID: nfcUID,
                        drawCount: drawCount,
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                throw new Error('交易失败');
            }
        } catch (error) {
            console.error('使用抽卡券抽卡失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 传统付费抽卡 (已废弃 - 合约中该功能已被移除)
     */
    async drawCatNFTTraditional(
        ownerAddress: string,
        catName: string
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any; rarity?: string; color?: string; drawCount?: number }> {
        try {
            return {
                success: false,
                error: '传统抽卡功能已被移除，请使用社交抽卡功能'
            };

            // 以下代码已注释，因为合约中的drawCatNFT函数已被移除
            /*
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            console.log(`开始传统抽卡: ${catName} -> ${ownerAddress}`);

            // 调用合约的drawCatNFT方法
            const tx = await this.catNFTContract.drawCatNFT(
                catName,
                {
                    gasLimit: 600000,
                    gasPrice: parseEther('0.00000002'), // 20 gwei
                    value: parseEther('0.1') // 抽卡费用 0.1 INJ
                }
            );

            console.log(`传统抽卡交易已发送，交易哈希: ${tx.hash}`);

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`传统抽卡成功: ${catName} -> ${ownerAddress}, 交易哈希: ${tx.hash}`);

                // 解析事件获取NFT信息
                let rarity = 'R';
                let color = '黑色';
                let tokenId = '';
                let drawCount = 0;

                // 查找CatNFTMinted事件
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = this.catNFTContract.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'CatNFTMinted') {
                            tokenId = parsedLog.args.tokenId.toString();
                            const rarityIndex = parsedLog.args.rarity;
                            color = parsedLog.args.color;
                            drawCount = parsedLog.args.drawCount?.toNumber() || 0;

                            // 转换稀有度枚举
                            const rarityMap = ['R', 'SR', 'SSR', 'UR'];
                            rarity = rarityMap[rarityIndex] || 'R';
                            break;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }

                return {
                    success: true,
                    txHash: tx.hash,
                    rarity,
                    color,
                    drawCount,
                    rawTx: {
                        type: 'CAT_NFT_TRADITIONAL_MINT',
                        name: catName,
                        tokenId: tokenId,
                        rarity: rarity,
                        color: color,
                        owner: ownerAddress,
                        drawCount: drawCount,
                        blockNumber: receipt.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        timestamp: new Date().toISOString()
                    }
                };
            } else {
                throw new Error('交易失败');
            }
            */
        } catch (error) {
            console.error('传统抽卡失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取抽卡统计信息
     */
    async getDrawStats(nfcUID: string): Promise<{
        availableDraws: number;
        usedDraws: number;
        totalDraws: number;
        socialBonus: number;
    }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            // 调用合约方法获取统计信息
            const stats = await this.catNFTContract.getDrawStats(nfcUID);

            // 获取社交奖励值
            const socialBonus = await this.catNFTContract.getSocialBonus(nfcUID);

            return {
                availableDraws: Number(stats[0]) || 0, // available
                usedDraws: Number(stats[1]) || 0,     // used  
                totalDraws: Number(stats[2]) || 0,    // total
                socialBonus: Number(socialBonus) || 0
            };
        } catch (error) {
            console.error('获取抽卡统计失败:', error);
            return {
                availableDraws: 0,
                usedDraws: 0,
                totalDraws: 0,
                socialBonus: 0
            };
        }
    }

    /**
     * 获取已互动的NFC列表
     */
    async getInteractedNFCs(nfcUID: string): Promise<string[]> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            // 调用合约方法获取已互动NFC列表
            const interactedNFCs = await this.catNFTContract.getInteractedNFCs(nfcUID);

            return Array.isArray(interactedNFCs) ? interactedNFCs : [];
        } catch (error) {
            console.error('获取已互动NFC列表失败:', error);
            return [];
        }
    }



    /**
     * 检查两个NFC是否已经互动过
     */
    async hasInteracted(nfc1: string, nfc2: string): Promise<boolean> {
        try {
            if (!this.catNFTContract) {
                return false;
            }

            return await this.catNFTContract.hasInteracted(nfc1, nfc2);
        } catch (error) {
            console.error('检查NFC互动状态失败:', error);
            return false;
        }
    }

    /**
     * 获取合约状态信息
     */
    async getContractStatus(): Promise<{
        nfcRegistry: boolean;
        domainNFT: boolean;
        catNFT: boolean;
        networkInfo: any;
    }> {
        try {
            return {
                nfcRegistry: !!this.nfcRegistryContract,
                domainNFT: !!this.domainNFTContract,
                catNFT: !!this.catNFTContract,
                networkInfo: this.getNetworkInfo()
            };
        } catch (error) {
            console.error('获取合约状态失败:', error);
            return {
                nfcRegistry: false,
                domainNFT: false,
                catNFT: false,
                networkInfo: null
            };
        }
    }
}