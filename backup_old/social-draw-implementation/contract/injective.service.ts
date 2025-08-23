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

// 合约 ABI 常量
const NFCWalletRegistryABI = require('./abis/NFCWalletRegistry.json');
const INJDomainNFTABI = require('./abis/INJDomainNFT.json');
const CatNFTABI = require('./abis/CatNFT.json');

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

            // 创建MsgSend消息
            const msg = MsgSend.fromJSON({
                amount: {
                    denom: 'inj',
                    amount: new BigNumberInBase(amount).toWei().toFixed()
                },
                srcInjectiveAddress: masterAddress,
                dstInjectiveAddress: toAddress
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
                        to: toAddress,
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
        tokenId: string
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any }> {
        try {
            if (!this.domainNFTContract) {
                throw new Error('域名NFT合约未初始化');
            }

            // 提取域名前缀（移除.inj后缀）
            const domainPrefix = domainName.replace('.inj', '');
            
            // 调用合约的mintDomainNFT方法
            console.log(`开始铸造域名NFT: ${domainName} -> ${ownerAddress}, NFC: ${nfcUID}`);
            
            const tx = await this.domainNFTContract.mintDomainNFT(
                domainPrefix,
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
     * 社交抽卡铸造小猫NFT
     */
    async socialMintCatNFT(
        ownerAddress: string,
        myNFC: string,
        otherNFC: string,
        catName: string
    ): Promise<{ success: boolean; txHash?: string; error?: string; rawTx?: any; rarity?: string; color?: string; drawCount?: number }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            console.log(`开始社交抽卡: ${catName} -> ${ownerAddress}, MyNFC: ${myNFC}, OtherNFC: ${otherNFC}`);
            
            // 调用合约的socialDrawCatNFT方法
            const tx = await this.catNFTContract.socialDrawCatNFT(
                myNFC,
                otherNFC,
                catName,
                {
                    gasLimit: 700000, // 增加gas限制，因为社交抽卡逻辑更复杂
                    gasPrice: parseEther('0.00000002'), // 20 gwei
                    value: parseEther('0.1') // 抽卡费用 0.1 INJ
                }
            );

            console.log(`社交抽卡交易已发送，交易哈希: ${tx.hash}`);
            
            // 等待交易确认
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`社交抽卡成功: ${catName} -> ${ownerAddress}, 交易哈希: ${tx.hash}`);
                
                // 解析事件获取NFT信息
                let rarity = 'R'; // 默认稀有度
                let color = 'black'; // 默认颜色
                let tokenId = '';
                let drawCount = 0;
                
                // 查找SocialDrawCompleted事件
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = this.catNFTContract.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === 'SocialDrawCompleted') {
                            tokenId = parsedLog.args.tokenId.toString();
                            const rarityIndex = parsedLog.args.rarity;
                            color = parsedLog.args.color;
                            drawCount = parsedLog.args.drawCount.toNumber();
                            
                            // 转换稀有度枚举
                            const rarityMap = ['R', 'SR', 'SSR', 'UR'];
                            rarity = rarityMap[rarityIndex] || 'R';
                            break;
                        }
                    } catch (e) {
                        // 如果没有找到SocialDrawCompleted事件，尝试查找CatNFTMinted事件
                        try {
                            const parsedLog = this.catNFTContract.interface.parseLog(log);
                            if (parsedLog && parsedLog.name === 'CatNFTMinted') {
                                tokenId = parsedLog.args.tokenId.toString();
                                const rarityIndex = parsedLog.args.rarity;
                                color = parsedLog.args.color;
                                
                                // 转换稀有度枚举
                                const rarityMap = ['R', 'SR', 'SSR', 'UR'];
                                rarity = rarityMap[rarityIndex] || 'R';
                            }
                        } catch (e2) {
                            // 忽略解析错误
                        }
                    }
                }

                return {
                    success: true,
                    txHash: tx.hash,
                    rarity,
                    color,
                    drawCount,
                    rawTx: {
                        type: 'CAT_NFT_SOCIAL_MINT',
                        name: catName,
                        tokenId: tokenId,
                        rarity: rarity,
                        color: color,
                        owner: ownerAddress,
                        myNFC: myNFC,
                        otherNFC: otherNFC,
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
            console.error('社交抽卡失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取NFC的社交统计信息
     */
    async getSocialStats(nfcUID: string): Promise<{
        drawCount: number;
        interactedNFCs: string[];
        socialBonus: number;
    }> {
        try {
            if (!this.catNFTContract) {
                throw new Error('小猫NFT合约未初始化');
            }

            // 获取抽卡次数
            const drawCount = await this.catNFTContract.getDrawCount(nfcUID);
            
            // 获取已互动的NFC列表
            const interactedNFCs = await this.catNFTContract.getInteractedNFCs(nfcUID);
            
            // 获取社交奖励
            const socialBonus = await this.catNFTContract.getSocialBonus(nfcUID);

            return {
                drawCount: drawCount.toNumber(),
                interactedNFCs: interactedNFCs || [],
                socialBonus: socialBonus.toNumber()
            };
        } catch (error) {
            console.error('获取社交统计失败:', error);
            return {
                drawCount: 0,
                interactedNFCs: [],
                socialBonus: 0
            };
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