/**
 * 前端与Injective EVM交互示例
 * 使用ethers.js v6连接到Injective EVM测试网
 */

import { ethers } from 'ethers';

// Injective EVM测试网配置
const INJECTIVE_EVM_CONFIG = {
    chainId: '0x59f', // 1439 in hexadecimal
    chainName: 'Injective EVM Testnet',
    rpcUrls: ['https://k8s.testnet.json-rpc.injective.network/'],
    nativeCurrency: {
        name: 'Injective',
        symbol: 'INJ',
        decimals: 18,
    },
    blockExplorerUrls: ['https://testnet.blockscout.injective.network/'],
};

// 合约ABI - 需要与后端保持同步
const NFC_REGISTRY_ABI = [
    'function bindNFCWallet(string memory nfcUID, address walletAddress) external',
    'function unbindNFCWallet(string memory nfcUID, bytes memory ownerSignature) external',
    'function detectAndBindBlankCard(string memory nfcUID, address newWalletAddress) external returns (bool)',
    'function isNFCBound(string memory nfcUID) external view returns (bool)',
    'function isBlankCard(string memory nfcUID) external view returns (bool)',
    'function getWalletCardStats(address walletAddress) external view returns (uint256 totalCards, uint256 activeCards, uint256 blankCards)',
];

const NFT_CARD_ABI = [
    'function mintCardNFT(string memory nfcUID, string memory seriesId, address initialOwner) external returns (uint256)',
    'function interactWithCard(string memory myNfcUID, string memory targetNfcUID, string memory interactionType) external',
    'function unbindAndTransferCard(string memory nfcUID, address newOwner, bytes memory ownerSignature) external',
    'function unbindAndBurnCard(string memory nfcUID, bytes memory ownerSignature) external',
    'function getCardInfo(uint256 tokenId) external view returns (tuple(string,string,string,uint256,uint256,uint256,uint256,uint256,bool,address,string))',
];

// 合约地址 - 需要在部署后更新
const CONTRACTS = {
    NFC_REGISTRY: '0x...', // 部署后的NFCWalletRegistry合约地址
    NFT_CARD: '0x...', // 部署后的NFCCardNFT合约地址
};

class InjectiveEVMService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.nfcRegistry = null;
        this.nftCard = null;
    }

    /**
     * 连接MetaMask并添加Injective EVM网络
     */
    async connectMetaMask() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask not installed!');
        }

        try {
            // 添加Injective EVM网络到MetaMask
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [INJECTIVE_EVM_CONFIG],
            });

            // 创建provider和signer
            this.provider = new ethers.BrowserProvider(window.ethereum);
            await this.provider.send('eth_requestAccounts', []);
            this.signer = await this.provider.getSigner();

            // 初始化合约实例
            this.nfcRegistry = new ethers.Contract(
                CONTRACTS.NFC_REGISTRY,
                NFC_REGISTRY_ABI,
                this.signer
            );

            this.nftCard = new ethers.Contract(
                CONTRACTS.NFT_CARD,
                NFT_CARD_ABI,
                this.signer
            );

            const address = await this.signer.getAddress();
            console.log('Connected to Injective EVM:', address);

            return address;
        } catch (error) {
            console.error('Failed to connect to MetaMask:', error);
            throw error;
        }
    }

    /**
     * 检查NFC卡片是否为空白卡
     */
    async checkBlankCard(nfcUID) {
        try {
            const isBlank = await this.nfcRegistry.isBlankCard(nfcUID);
            const isBound = await this.nfcRegistry.isNFCBound(nfcUID);

            return {
                isBlank,
                isBound,
                status: isBlank ? 'blank' : (isBound ? 'bound' : 'unknown')
            };
        } catch (error) {
            console.error('Error checking blank card:', error);
            return null;
        }
    }

    /**
     * 创建签名用于解绑操作
     */
    async createUnbindSignature(nfcUID, action = 'unbind') {
        try {
            const address = await this.signer.getAddress();
            const chainId = await this.provider.getNetwork().then(n => n.chainId);

            // 构造签名消息（与合约中的验证逻辑一致）
            const message = ethers.solidityPackedKeccak256(
                ['address', 'string', 'string', 'uint256'],
                [address, nfcUID, action, chainId]
            );

            // 创建以太坊标准签名消息格式
            const ethMessage = ethers.hashMessage(ethers.getBytes(message));
            const signature = await this.signer.signMessage(ethers.getBytes(message));

            return signature;
        } catch (error) {
            console.error('Error creating signature:', error);
            return null;
        }
    }

    /**
     * 卡片社交交互
     */
    async interactWithCard(myNfcUID, targetNfcUID, interactionType) {
        try {
            const tx = await this.nftCard.interactWithCard(
                myNfcUID,
                targetNfcUID,
                interactionType,
                {
                    gasLimit: 300000
                }
            );

            console.log('Interaction transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Interaction completed in block:', receipt.blockNumber);

            return receipt;
        } catch (error) {
            console.error('Error in card interaction:', error);
            throw error;
        }
    }

    /**
     * 解绑并转移NFT
     */
    async unbindAndTransferCard(nfcUID, newOwner) {
        try {
            const signature = await this.createUnbindSignature(nfcUID, 'transfer');
            if (!signature) {
                throw new Error('Failed to create signature');
            }

            const tx = await this.nftCard.unbindAndTransferCard(
                nfcUID,
                newOwner,
                signature,
                {
                    gasLimit: 250000
                }
            );

            console.log('Transfer transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Transfer completed in block:', receipt.blockNumber);

            return receipt;
        } catch (error) {
            console.error('Error transferring card:', error);
            throw error;
        }
    }

    /**
     * 解绑并销毁NFT
     */
    async unbindAndBurnCard(nfcUID) {
        try {
            const signature = await this.createUnbindSignature(nfcUID, 'burn');
            if (!signature) {
                throw new Error('Failed to create signature');
            }

            const tx = await this.nftCard.unbindAndBurnCard(
                nfcUID,
                signature,
                {
                    gasLimit: 200000
                }
            );

            console.log('Burn transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Burn completed in block:', receipt.blockNumber);

            return receipt;
        } catch (error) {
            console.error('Error burning card:', error);
            throw error;
        }
    }

    /**
     * 获取钱包卡片统计信息
     */
    async getWalletStats(walletAddress) {
        try {
            const result = await this.nfcRegistry.getWalletCardStats(walletAddress);
            return {
                totalCards: Number(result.totalCards),
                activeCards: Number(result.activeCards),
                blankCards: Number(result.blankCards)
            };
        } catch (error) {
            console.error('Error getting wallet stats:', error);
            return null;
        }
    }
}

// 使用示例
async function example() {
    const service = new InjectiveEVMService();

    try {
        // 1. 连接MetaMask
        const userAddress = await service.connectMetaMask();
        console.log('User connected:', userAddress);

        // 2. 检查NFC卡片状态
        const cardStatus = await service.checkBlankCard('your-nfc-uid-here');
        console.log('Card status:', cardStatus);

        // 3. 社交交互示例
        if (cardStatus && !cardStatus.isBlank) {
            await service.interactWithCard(
                'my-nfc-uid',
                'target-nfc-uid',
                'battle'
            );
        }

        // 4. 获取钱包统计
        const stats = await service.getWalletStats(userAddress);
        console.log('Wallet stats:', stats);

    } catch (error) {
        console.error('Example error:', error);
    }
}

// 导出服务类
export { InjectiveEVMService, INJECTIVE_EVM_CONFIG, example }; 