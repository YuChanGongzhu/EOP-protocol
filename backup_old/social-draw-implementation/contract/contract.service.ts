import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// 合约ABI - 实际部署时需要从编译产物中获取完整ABI
const DOMAIN_REGISTRY_ABI = [
    'function register(string memory domainPrefix) external payable',
    'function isDomainAvailable(string memory domainPrefix) external view returns (bool)',
    'function resolveDomain(string memory domain) external view returns (address)',
    'function reverseResolve(address addr) external view returns (string memory)',
    'function transferDomain(string memory domain, address to) external',
    'function setPrimaryDomain(string memory domain) external',
    'function getUserDomains(address user) external view returns (string[] memory)',
    'event DomainRegistered(string indexed domain, address indexed owner, uint256 registeredAt, uint256 expiresAt)'
];

const NFC_REGISTRY_ABI = [
    'function bindNFCWallet(string memory nfcUID, address walletAddress) external',
    'function unbindNFCWallet(string memory nfcUID, bytes memory ownerSignature) external',
    'function emergencyUnbindNFCWallet(string memory nfcUID) external',
    'function detectAndBindBlankCard(string memory nfcUID, address newWalletAddress) external returns (bool)',
    'function initializeBlankCard(string memory nfcUID, string memory initMetadata) external',
    'function isNFCBound(string memory nfcUID) external view returns (bool)',
    'function isBlankCard(string memory nfcUID) external view returns (bool)',
    'function getNFCStatus(string memory nfcUID) external view returns (uint8)',
    'function getNFCWallet(string memory nfcUID) external view returns (address)',
    'function getWalletActiveNFCs(address walletAddress) external view returns (string[] memory)',
    'function getWalletCardStats(address walletAddress) external view returns (uint256 totalCards, uint256 activeCards, uint256 blankCards)',
    'function getNFCHistory(string memory nfcUID) external view returns (tuple(address,uint256,uint256,bool,bool,string)[] memory)',
    'event NFCWalletBound(string indexed nfcUID, address indexed walletAddress, uint256 boundAt)',
    'event NFCWalletUnbound(string indexed nfcUID, address indexed walletAddress, uint256 unboundAt, bool cardReset)',
    'event BlankCardDetected(string indexed nfcUID, address indexed newWallet, uint256 timestamp)',
    'event CardInitialized(string indexed nfcUID, address indexed walletAddress, uint256 timestamp)'
];

// 合约ABI - 更新为小猫NFT系统
const CAT_CARD_NFT_ABI = [
    'function mintCatCard(string memory nfcUID, address initialOwner) external returns (uint256)',
    'function unbindAndTransferCat(string memory nfcUID, address newOwner, bytes memory ownerSignature) external',
    'function unbindAndBurnCat(string memory nfcUID, bytes memory ownerSignature) external',
    'function interactWithCat(string memory myNfcUID, string memory targetNfcUID, uint8 interactionType, string memory message) external',
    'function getCatInfo(uint256 tokenId) external view returns (tuple(string,string,uint8,uint8,uint256,uint256,uint256,uint256,bool,address,string))',
    'function getWalletCats(address wallet) external view returns (uint256[] memory)',
    'function getCatInteractions(uint256 tokenId) external view returns (tuple(uint256,address,uint8,string)[] memory)',
    'function getTokenIdByNFC(string memory nfcUID) external view returns (uint256)',
    'function setAuthorizedMinter(address minter, bool authorized) external',
    'event CatMinted(uint256 indexed tokenId, string indexed nfcUID, address indexed owner, string catName, uint8 breed)',
    'event CatBound(uint256 indexed tokenId, string indexed nfcUID, address indexed wallet)',
    'event CatUnbound(uint256 indexed tokenId, string indexed nfcUID, address indexed wallet, bool burned)',
    'event CatsInteracted(uint256 indexed tokenId1, uint256 indexed tokenId2, address indexed initiator, uint8 interactionType)',
    'event CatMoodChanged(uint256 indexed tokenId, uint8 oldMood, uint8 newMood)',
    'event FriendshipLevelUp(uint256 indexed tokenId, uint256 oldLevel, uint256 newLevel)'
];

@Injectable()
export class ContractService {
    private provider: ethers.Provider;
    private wallet: ethers.Wallet;
    private domainRegistryContract: ethers.Contract;
    private nfcRegistryContract: ethers.Contract;
    private nfcCardNFTContract: ethers.Contract;

    constructor(private configService: ConfigService) {
        this.initializeContracts();
    }

    private async initializeContracts() {
        // 初始化Injective EVM网络连接
        const rpcUrl = this.configService.get<string>('INJECTIVE_RPC_URL') ||
            'https://k8s.testnet.json-rpc.injective.network/';

        console.log('Initializing Injective EVM connection:', rpcUrl);

        this.provider = new ethers.JsonRpcProvider(rpcUrl, {
            name: 'Injective EVM',
            chainId: Number(this.configService.get<string>('INJECTIVE_CHAIN_ID') || '1439'),
        });

        // 初始化钱包 (用于发送交易)
        const privateKey = this.configService.get<string>('CONTRACT_PRIVATE_KEY');
        if (privateKey) {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }

        // 初始化合约实例
        const domainRegistryAddress = this.configService.get<string>('DOMAIN_REGISTRY_ADDRESS');
        const nfcRegistryAddress = this.configService.get<string>('NFC_REGISTRY_ADDRESS');
        const nfcCardNFTAddress = this.configService.get<string>('NFC_CARD_NFT_ADDRESS');

        if (domainRegistryAddress) {
            this.domainRegistryContract = new ethers.Contract(
                domainRegistryAddress,
                DOMAIN_REGISTRY_ABI,
                this.wallet || this.provider
            );
        }

        if (nfcRegistryAddress) {
            this.nfcRegistryContract = new ethers.Contract(
                nfcRegistryAddress,
                NFC_REGISTRY_ABI,
                this.wallet || this.provider
            );
        }

        if (nfcCardNFTAddress) {
            this.nfcCardNFTContract = new ethers.Contract(
                nfcCardNFTAddress,
                CAT_CARD_NFT_ABI, // 使用新的小猫NFT ABI
                this.wallet || this.provider
            );
        }
    }

    // =================
    // 域名管理功能
    // =================

    /**
     * 检查域名是否可用
     */
    async isDomainAvailable(domainPrefix: string): Promise<boolean> {
        try {
            if (!this.domainRegistryContract) {
                throw new Error('Domain registry contract not initialized');
            }
            return await this.domainRegistryContract.isDomainAvailable(domainPrefix);
        } catch (error) {
            console.error('Error checking domain availability:', error);
            return false;
        }
    }

    /**
     * 注册域名到链上
     */
    async registerDomain(domainPrefix: string, userAddress: string): Promise<string | null> {
        try {
            if (!this.domainRegistryContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            // 检查域名是否可用
            const isAvailable = await this.isDomainAvailable(domainPrefix);
            if (!isAvailable) {
                throw new Error('Domain not available');
            }

            // 获取注册费用
            const registrationFee = ethers.parseEther('0.001'); // 0.001 INJ

            // 发送注册交易
            const tx = await this.domainRegistryContract.register(domainPrefix, {
                value: registrationFee,
                gasLimit: 300000
            });

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                const fullDomain = `${domainPrefix}.inj`;
                console.log(`Domain ${fullDomain} registered successfully`);
                return fullDomain;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error registering domain:', error);
            return null;
        }
    }

    /**
     * 解析域名到地址
     */
    async resolveDomain(domain: string): Promise<string | null> {
        try {
            if (!this.domainRegistryContract) {
                return null;
            }

            const address = await this.domainRegistryContract.resolveDomain(domain);
            return address === ethers.ZeroAddress ? null : address;
        } catch (error) {
            console.error('Error resolving domain:', error);
            return null;
        }
    }

    /**
     * 反向解析地址到域名
     */
    async reverseResolve(address: string): Promise<string | null> {
        try {
            if (!this.domainRegistryContract) {
                return null;
            }

            const domain = await this.domainRegistryContract.reverseResolve(address);
            return domain || null;
        } catch (error) {
            console.error('Error reverse resolving:', error);
            return null;
        }
    }

    /**
     * 获取用户的所有域名
     */
    async getUserDomains(userAddress: string): Promise<string[]> {
        try {
            if (!this.domainRegistryContract) {
                return [];
            }

            return await this.domainRegistryContract.getUserDomains(userAddress);
        } catch (error) {
            console.error('Error getting user domains:', error);
            return [];
        }
    }

    // =================
    // NFC注册功能
    // =================

    /**
     * 记录NFC钱包绑定到链上
     */
    async recordNFCWalletBinding(nfcUID: string, walletAddress: string): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            // 检查NFC是否已绑定
            const isAlreadyBound = await this.isNFCBound(nfcUID);
            if (isAlreadyBound) {
                console.log(`NFC ${nfcUID} already bound`);
                return true; // 已绑定，视为成功
            }

            // 发送绑定交易
            const tx = await this.nfcRegistryContract.bindNFCWallet(nfcUID, walletAddress, {
                gasLimit: 200000
            });

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`NFC ${nfcUID} bound to wallet ${walletAddress}`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error recording NFC wallet binding:', error);
            return false;
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
            console.error('Error checking NFC binding:', error);
            return false;
        }
    }

    /**
     * 获取NFC绑定的钱包地址
     */
    async getNFCWallet(nfcUID: string): Promise<string | null> {
        try {
            if (!this.nfcRegistryContract) {
                return null;
            }

            const address = await this.nfcRegistryContract.getNFCWallet(nfcUID);
            return address === ethers.ZeroAddress ? null : address;
        } catch (error) {
            console.error('Error getting NFC wallet:', error);
            return null;
        }
    }

    /**
     * 获取钱包绑定的所有NFC
     */
    async getWalletNFCs(walletAddress: string): Promise<string[]> {
        try {
            if (!this.nfcRegistryContract) {
                return [];
            }

            return await this.nfcRegistryContract.getWalletNFCs(walletAddress);
        } catch (error) {
            console.error('Error getting wallet NFCs:', error);
            return [];
        }
    }

    /**
 * 检测空白卡并自动创建账户绑定
 */
    async detectAndBindBlankCard(nfcUID: string, newWalletAddress: string): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            console.log(`Detecting blank card for NFC ${nfcUID}, creating wallet ${newWalletAddress}`);

            // 调用合约检测并绑定空白卡
            const tx = await this.nfcRegistryContract.detectAndBindBlankCard(nfcUID, newWalletAddress, {
                gasLimit: 300000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`Blank card ${nfcUID} detected and bound to ${newWalletAddress}`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error detecting and binding blank card:', error);
            return false;
        }
    }

    /**
     * 初始化空白卡
     */
    async initializeBlankCard(nfcUID: string, metadata: string = 'initialized'): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            const tx = await this.nfcRegistryContract.initializeBlankCard(nfcUID, metadata, {
                gasLimit: 200000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`Blank card ${nfcUID} initialized`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error initializing blank card:', error);
            return false;
        }
    }

    /**
     * 解绑NFC卡片（需要签名验证）
     */
    async unbindNFCWallet(nfcUID: string, ownerSignature: string): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            // 检查NFC是否已绑定
            const isBound = await this.isNFCBound(nfcUID);
            if (!isBound) {
                console.log(`NFC ${nfcUID} is not bound`);
                return false;
            }

            // 发送解绑交易（需要签名验证）
            const tx = await this.nfcRegistryContract.unbindNFCWallet(nfcUID, ownerSignature, {
                gasLimit: 250000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`NFC ${nfcUID} unbound successfully`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error unbinding NFC wallet:', error);
            return false;
        }
    }

    /**
     * 紧急解绑（仅授权操作者）
     */
    async emergencyUnbindNFCWallet(nfcUID: string): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            const tx = await this.nfcRegistryContract.emergencyUnbindNFCWallet(nfcUID, {
                gasLimit: 250000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`NFC ${nfcUID} emergency unbound successfully`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error emergency unbinding NFC wallet:', error);
            return false;
        }
    }

    /**
     * 检查NFC是否为空白卡片
     */
    async isNFCBlank(nfcUID: string): Promise<boolean> {
        try {
            if (!this.nfcRegistryContract) {
                return true; // 如果合约不可用，认为是空白的
            }

            return await this.nfcRegistryContract.isNFCBlank(nfcUID);
        } catch (error) {
            console.error('Error checking NFC blank status:', error);
            return true;
        }
    }

    /**
     * 获取NFC卡片状态
     */
    async getNFCStatus(nfcUID: string): Promise<{
        status: number;
        description: string;
    }> {
        try {
            if (!this.nfcRegistryContract) {
                return { status: 0, description: 'blank' };
            }

            const status = await this.nfcRegistryContract.getNFCStatus(nfcUID);
            const descriptions = ['blank', 'bound', 'frozen'];

            return {
                status: Number(status),
                description: descriptions[Number(status)] || 'unknown'
            };
        } catch (error) {
            console.error('Error getting NFC status:', error);
            return { status: 0, description: 'blank' };
        }
    }

    /**
     * 获取NFC历史绑定记录
     */
    async getNFCHistory(nfcUID: string): Promise<any[]> {
        try {
            if (!this.nfcRegistryContract) {
                return [];
            }

            return await this.nfcRegistryContract.getNFCHistory(nfcUID);
        } catch (error) {
            console.error('Error getting NFC history:', error);
            return [];
        }
    }

    // =================
    // NFT卡片管理功能
    // =================

    /**
     * 为NFC卡片铸造NFT
     */
    async mintCardNFT(nfcUID: string, seriesId: string, ownerAddress: string): Promise<number | null> {
        try {
            if (!this.nfcCardNFTContract || !this.wallet) {
                throw new Error('NFT contract or wallet not initialized');
            }

            // 检查NFC是否已绑定
            const isBound = await this.isNFCBound(nfcUID);
            if (!isBound) {
                throw new Error('NFC not bound to wallet');
            }

            // 发送铸造交易
            const tx = await this.nfcCardNFTContract.mintCatCard(nfcUID, ownerAddress, {
                gasLimit: 300000
            });

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                // 从事件中获取Token ID
                const mintEvent = receipt.logs.find((log: any) =>
                    log.topics[0] === ethers.id('CatMinted(uint256,string,address,string,uint8)')
                );

                if (mintEvent) {
                    const tokenId = Number(mintEvent.topics[1]);
                    console.log(`NFT minted for NFC ${nfcUID}, Token ID: ${tokenId}`);
                    return tokenId;
                }
            }

            throw new Error('Transaction failed or event not found');
        } catch (error) {
            console.error('Error minting card NFT:', error);
            return null;
        }
    }

    /**
     * 解绑并销毁NFC卡片NFT
     */
    async unbindAndBurnCardNFT(nfcUID: string, ownerSignature: string = '0x'): Promise<boolean> {
        try {
            if (!this.nfcCardNFTContract || !this.wallet) {
                throw new Error('NFT contract or wallet not initialized');
            }

            // 检查NFT是否存在
            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                console.log(`No NFT found for NFC ${nfcUID}`);
                return true; // 没有NFT也算成功
            }

            // 发送解绑并销毁交易
            const tx = await this.nfcCardNFTContract.unbindAndBurnCat(nfcUID, ownerSignature, {
                gasLimit: 200000
            });

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`NFT for NFC ${nfcUID} unbound and burned successfully`);
                return true;
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error unbinding and burning card NFT:', error);
            return false;
        }
    }

    /**
     * 获取NFC对应的NFT信息
     */
    async getCardNFTInfo(nfcUID: string): Promise<any | null> {
        try {
            if (!this.nfcCardNFTContract) {
                return null;
            }

            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                return null;
            }

            return await this.nfcCardNFTContract.getCatInfo(tokenId);
        } catch (error) {
            console.error('Error getting card NFT info:', error);
            return null;
        }
    }

    /**
     * NFC卡片社交交互功能
     */
    async interactWithCard(
        myNfcUID: string,
        targetNfcUID: string,
        interactionType: 'battle' | 'social' | 'trade',
        userAddress: string
    ): Promise<boolean> {
        try {
            if (!this.nfcCardNFTContract) {
                throw new Error('NFT contract not initialized');
            }

            // 构建交易参数，让用户自己发送交易
            const data = this.nfcCardNFTContract.interface.encodeFunctionData(
                'interactWithCat',
                [myNfcUID, targetNfcUID, interactionType, ''] // 小猫NFT交互类型是uint8
            );

            console.log(`Card interaction initiated: ${myNfcUID} -> ${targetNfcUID}, type: ${interactionType}`);
            console.log(`Transaction data: ${data}`);
            console.log(`Contract address: ${await this.nfcCardNFTContract.getAddress()}`);

            // 返回true表示交易数据准备完成，实际发送由前端处理
            return true;
        } catch (error) {
            console.error('Error preparing card interaction:', error);
            return false;
        }
    }

    /**
     * 解绑并转移NFT所有权
     */
    async unbindAndTransferCardNFT(
        nfcUID: string,
        newOwner: string,
        ownerSignature: string
    ): Promise<boolean> {
        try {
            if (!this.nfcCardNFTContract) {
                throw new Error('NFT contract not initialized');
            }

            // 构建交易数据，让用户自己发送交易
            const data = this.nfcCardNFTContract.interface.encodeFunctionData(
                'unbindAndTransferCat',
                [nfcUID, newOwner, ownerSignature]
            );

            console.log(`Transfer card NFT prepared for NFC ${nfcUID} to ${newOwner}`);
            console.log(`Transaction data: ${data}`);

            return true;
        } catch (error) {
            console.error('Error preparing card transfer:', error);
            return false;
        }
    }

    /**
     * 获取钱包卡片统计信息
     */
    async getWalletCardStats(walletAddress: string): Promise<{
        totalCards: number;
        activeCards: number;
        blankCards: number;
    } | null> {
        try {
            if (!this.nfcRegistryContract) {
                return null;
            }

            const result = await this.nfcRegistryContract.getWalletCardStats(walletAddress);
            return {
                totalCards: Number(result.totalCards),
                activeCards: Number(result.activeCards),
                blankCards: Number(result.blankCards)
            };
        } catch (error) {
            console.error('Error getting wallet card stats:', error);
            return null;
        }
    }

    /**
     * 获取卡片历史所有者
     */
    async getCardOwnershipHistory(nfcUID: string): Promise<any[]> {
        try {
            if (!this.nfcCardNFTContract) {
                return [];
            }

            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                return [];
            }

            return await this.nfcCardNFTContract.getCatInteractions(tokenId); // 小猫NFT的交互历史
        } catch (error) {
            console.error('Error getting card ownership history:', error);
            return [];
        }
    }

    /**
     * 获取卡片历史所有者数量
     */
    async getCardOwnershipCount(nfcUID: string): Promise<number> {
        try {
            if (!this.nfcCardNFTContract) {
                return 0;
            }

            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                return 0;
            }

            // 小猫NFT没有直接的ownership count，因为它是社交互动的
            // 这里返回0，表示没有直接的卡片所有权数量概念
            return 0;
        } catch (error) {
            console.error('Error getting card ownership count:', error);
            return 0;
        }
    }

    /**
     * 检查地址是否曾经拥有过该卡片
     */
    async hasOwnedCard(nfcUID: string, ownerAddress: string): Promise<boolean> {
        try {
            if (!this.nfcCardNFTContract) {
                return false;
            }

            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                return false;
            }

            // 小猫NFT没有直接的ownership history，因为它是社交互动的
            // 这里返回false，表示没有直接的卡片所有权历史概念
            return false;
        } catch (error) {
            console.error('Error checking card ownership history:', error);
            return false;
        }
    }

    /**
     * 获取地址拥有某卡片的总时长
     */
    async getOwnershipDuration(nfcUID: string, ownerAddress: string): Promise<number> {
        try {
            if (!this.nfcCardNFTContract) {
                return 0;
            }

            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                return 0;
            }

            // 小猫NFT没有直接的ownership duration，因为它是社交互动的
            // 这里返回0，表示没有直接的卡片所有权时长概念
            return 0;
        } catch (error) {
            console.error('Error getting ownership duration:', error);
            return 0;
        }
    }

    /**
     * 批量获取卡片当前所有者
     */
    async batchGetCardOwners(nfcUIDs: string[]): Promise<string[]> {
        try {
            if (!this.nfcCardNFTContract) {
                return [];
            }

            // 获取所有Token ID
            const tokenIds: number[] = [];
            for (const nfcUID of nfcUIDs) {
                const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
                tokenIds.push(Number(tokenId));
            }

            // 批量获取所有者
            // 小猫NFT没有直接的batchGetCurrentOwners，因为它是社交互动的
            // 这里返回空数组，表示没有直接的批量获取所有者功能
            return [];
        } catch (error) {
            console.error('Error batch getting card owners:', error);
            return [];
        }
    }

    // =================
    // 小猫NFT系统专用功能
    // =================

    /**
     * 铸造小猫NFT (简化接口，供NFC服务调用)
     */
    async mintCatNFT(
        ownerAddress: string,
        catName: string,
        description: string
    ): Promise<{ success: boolean; tokenId?: string; error?: string }> {
        try {
            if (!this.nfcCardNFTContract || !this.wallet) {
                return {
                    success: false,
                    error: 'NFT contract or wallet not initialized'
                };
            }

            // 生成临时NFC UID用于铸造 (实际项目中应该使用真实的NFC UID)
            const tempNfcUID = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            console.log(`铸造小猫NFT: ${catName} for ${ownerAddress}`);

            // 调用合约铸造
            const tx = await this.nfcCardNFTContract.mintCatCard(tempNfcUID, ownerAddress, {
                gasLimit: 500000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                // 解析铸造事件获取tokenId
                const mintEvent = receipt.logs.find((log: any) => {
                    try {
                        const parsed = this.nfcCardNFTContract.interface.parseLog(log);
                        return parsed && parsed.name === 'CatMinted';
                    } catch {
                        return false;
                    }
                });

                if (mintEvent) {
                    const parsed = this.nfcCardNFTContract.interface.parseLog(mintEvent);
                    const tokenId = parsed.args.tokenId.toString();

                    console.log(`小猫NFT铸造成功: ${catName}, Token ID: ${tokenId}`);

                    return {
                        success: true,
                        tokenId: tokenId
                    };
                } else {
                    console.warn('铸造成功但未找到Mint事件');
                    return {
                        success: true,
                        tokenId: 'unknown'
                    };
                }
            } else {
                return {
                    success: false,
                    error: '交易失败'
                };
            }
        } catch (error) {
            console.error('小猫NFT铸造失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 销毁NFT (简化接口，供NFC服务调用)
     */
    async burnNFT(
        tokenId: string,
        ownerAddress: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            if (!this.nfcCardNFTContract || !this.wallet) {
                return {
                    success: false,
                    error: 'NFT contract or wallet not initialized'
                };
            }

            console.log(`销毁NFT: Token ID ${tokenId} for ${ownerAddress}`);

            // 对于小猫NFT，我们通过临时NFC UID来销毁
            // 实际实现中可能需要根据tokenId查找对应的NFC UID
            const tempNfcUID = `burn_${tokenId}_${Date.now()}`;

            const tx = await this.nfcCardNFTContract.unbindAndBurnCat(tempNfcUID, '0x', {
                gasLimit: 300000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`NFT销毁成功: Token ID ${tokenId}`);
                return {
                    success: true
                };
            } else {
                return {
                    success: false,
                    error: '销毁交易失败'
                };
            }
        } catch (error) {
            console.error('NFT销毁失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 为NFC卡片铸造小猫NFT
     */
    async mintCatCardNFT(nfcUID: string, ownerAddress: string): Promise<number | null> {
        try {
            if (!this.nfcCardNFTContract || !this.wallet) {
                throw new Error('NFT contract or wallet not initialized');
            }

            // 检查NFC是否已绑定
            const isBound = await this.isNFCBound(nfcUID);
            if (!isBound) {
                throw new Error('NFC not bound to wallet');
            }

            console.log(`Minting cat NFT for NFC ${nfcUID}, owner: ${ownerAddress}`);

            // 发送铸造交易
            const tx = await this.nfcCardNFTContract.mintCatCard(nfcUID, ownerAddress, {
                gasLimit: 500000,
                // 可能需要一些gas fee
                value: ethers.parseEther('0.001') // 0.001 INJ作为铸造费用
            });

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                // 从事件中获取Token ID
                const mintEvent = receipt.logs.find((log: any) => {
                    try {
                        const parsed = this.nfcCardNFTContract.interface.parseLog(log);
                        return parsed && parsed.name === 'CatMinted';
                    } catch {
                        return false;
                    }
                });

                if (mintEvent) {
                    const parsed = this.nfcCardNFTContract.interface.parseLog(mintEvent);
                    const tokenId = Number(parsed.args.tokenId);
                    console.log(`Cat NFT minted for NFC ${nfcUID}, Token ID: ${tokenId}`);
                    return tokenId;
                }
            }

            throw new Error('Transaction failed or event not found');
        } catch (error) {
            console.error('Error minting cat NFT:', error);
            return null;
        }
    }

    /**
     * 获取钱包拥有的所有小猫
     */
    async getWalletCats(walletAddress: string): Promise<any[]> {
        try {
            if (!this.nfcCardNFTContract) {
                return [];
            }

            const tokenIds = await this.nfcCardNFTContract.getWalletCats(walletAddress);
            const cats = [];

            for (const tokenId of tokenIds) {
                try {
                    const catInfo = await this.nfcCardNFTContract.getCatInfo(tokenId);
                    if (catInfo) {
                        cats.push({
                            tokenId: Number(tokenId),
                            nfcUID: catInfo[0],
                            catName: catInfo[1],
                            breed: Number(catInfo[2]),
                            mood: Number(catInfo[3]),
                            friendshipLevel: Number(catInfo[4]),
                            totalInteractions: Number(catInfo[5]),
                            lastInteraction: Number(catInfo[6]),
                            mintedAt: Number(catInfo[7]),
                            isActive: catInfo[8],
                            boundWallet: catInfo[9],
                            imageURI: catInfo[10]
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to get info for cat token ${tokenId}:`, error);
                }
            }

            return cats;
        } catch (error) {
            console.error('Error getting wallet cats:', error);
            return [];
        }
    }

    /**
     * 小猫社交交互
     */
    async interactWithCats(
        myNfcUID: string,
        targetNfcUID: string,
        interactionType: number, // 0=Pet, 1=Play, 2=Feed, 3=Photo
        message: string = '',
        userAddress: string
    ): Promise<{ success: boolean; transactionData?: any }> {
        try {
            if (!this.nfcCardNFTContract) {
                throw new Error('NFT contract not initialized');
            }

            // 验证两个NFC都有对应的NFT
            const myTokenId = await this.nfcCardNFTContract.getTokenIdByNFC(myNfcUID);
            const targetTokenId = await this.nfcCardNFTContract.getTokenIdByNFC(targetNfcUID);

            if (myTokenId === 0 || targetTokenId === 0) {
                throw new Error('One or both NFCs do not have associated cat NFTs');
            }

            // 构建交易数据，让前端用户自己发送交易
            const data = this.nfcCardNFTContract.interface.encodeFunctionData(
                'interactWithCat',
                [myNfcUID, targetNfcUID, interactionType, message]
            );

            return {
                success: true,
                transactionData: {
                    to: await this.nfcCardNFTContract.getAddress(),
                    data,
                    gasLimit: 300000,
                    value: '0'
                }
            };
        } catch (error) {
            console.error('Error preparing cat interaction:', error);
            return { success: false };
        }
    }

    /**
     * 获取小猫的交互历史
     */
    async getCatInteractionHistory(nfcUID: string): Promise<any[]> {
        try {
            if (!this.nfcCardNFTContract) {
                return [];
            }

            const tokenId = await this.nfcCardNFTContract.getTokenIdByNFC(nfcUID);
            if (tokenId === 0) {
                return [];
            }

            const interactions = await this.nfcCardNFTContract.getCatInteractions(tokenId);

            return interactions.map((interaction: any) => ({
                timestamp: Number(interaction[0]),
                interactor: interaction[1],
                interactionType: Number(interaction[2]),
                message: interaction[3]
            }));
        } catch (error) {
            console.error('Error getting cat interaction history:', error);
            return [];
        }
    }

    /**
     * 检查用户是否有权限铸造NFT
     */
    async isAuthorizedMinter(address: string): Promise<boolean> {
        try {
            if (!this.nfcCardNFTContract) {
                return false;
            }

            // 检查是否是授权的铸造者
            return await this.nfcCardNFTContract.authorizedMinters(address);
        } catch (error) {
            console.error('Error checking minter authorization:', error);
            return false;
        }
    }

    /**
     * 设置授权铸造者（仅owner可调用）
     */
    async setAuthorizedMinter(minterAddress: string, authorized: boolean): Promise<boolean> {
        try {
            if (!this.nfcCardNFTContract || !this.wallet) {
                throw new Error('Contract or wallet not initialized');
            }

            const tx = await this.nfcCardNFTContract.setAuthorizedMinter(minterAddress, authorized, {
                gasLimit: 100000
            });

            const receipt = await tx.wait();

            if (receipt.status === 1) {
                console.log(`Minter ${minterAddress} ${authorized ? 'authorized' : 'deauthorized'}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error setting authorized minter:', error);
            return false;
        }
    }

    // =================
    // 工具函数
    // =================

    /**
 * 检查合约连接状态
 */
    async getContractStatus(): Promise<{
        domainRegistry: boolean;
        nfcRegistry: boolean;
        nfcCardNFT: boolean;
        walletConnected: boolean;
        network: string;
    }> {
        try {
            const network = await this.provider.getNetwork();

            return {
                domainRegistry: !!this.domainRegistryContract,
                nfcRegistry: !!this.nfcRegistryContract,
                nfcCardNFT: !!this.nfcCardNFTContract,
                walletConnected: !!this.wallet,
                network: network.name || 'unknown'
            };
        } catch (error) {
            return {
                domainRegistry: false,
                nfcRegistry: false,
                nfcCardNFT: false,
                walletConnected: false,
                network: 'disconnected'
            };
        }
    }

    /**
     * 获取当前Gas价格
     */
    async getCurrentGasPrice(): Promise<string> {
        try {
            const gasPrice = await this.provider.getFeeData();
            return ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei');
        } catch (error) {
            console.error('Error getting gas price:', error);
            return '0';
        }
    }

    /**
 * 预估交易费用
 */
    async estimateTransactionCost(type: 'domain_register' | 'nfc_bind' | 'nfc_unbind' | 'nft_mint' | 'nft_burn'): Promise<string> {
        try {
            const gasPrice = await this.provider.getFeeData();

            const gasLimits = {
                'domain_register': 300000,
                'nfc_bind': 200000,
                'nfc_unbind': 250000,
                'nft_mint': 300000,
                'nft_burn': 200000
            };

            const gasLimit = gasLimits[type] || 200000;
            const cost = (gasPrice.gasPrice || 0n) * BigInt(gasLimit);
            return ethers.formatEther(cost);
        } catch (error) {
            console.error('Error estimating transaction cost:', error);
            return '0';
        }
    }

    /**
     * 完整的NFC解绑流程（包含NFT销毁）
     */
    async completeNFCUnbindProcess(nfcUID: string, resetToBlank: boolean = true): Promise<{
        nfcUnbound: boolean;
        nftBurned: boolean;
        success: boolean;
    }> {
        const result = {
            nfcUnbound: false,
            nftBurned: false,
            success: false
        };

        try {
            // 1. 先销毁NFT（如果存在）
            const nftBurnResult = await this.unbindAndBurnCardNFT(nfcUID);
            result.nftBurned = nftBurnResult;

            // 2. 再解绑NFC（使用紧急解绑功能）
            const nfcUnbindResult = await this.emergencyUnbindNFCWallet(nfcUID);
            result.nfcUnbound = nfcUnbindResult;

            // 3. 判断整体成功状态
            result.success = result.nfcUnbound; // NFT销毁失败不影响整体流程

            return result;
        } catch (error) {
            console.error('Error in complete NFC unbind process:', error);
            return result;
        }
    }
} 