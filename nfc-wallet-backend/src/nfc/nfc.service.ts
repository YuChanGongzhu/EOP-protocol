import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { InjectiveService } from '../contract/injective.service';
import { TransactionService } from '../contract/transaction.service';
import { RegisterNFCDto, BindNFCDto } from './dto/register-nfc.dto';
import { WalletResponseDto, TransactionResponseDto } from './dto/wallet-response.dto';
import { RegisterDomainDto, DomainNFTResponseDto, DomainAvailabilityDto } from './dto/domain-nft.dto';
import { DrawCatNFTDto, CatNFTResponseDto, CatNFTListDto, SocialStatsDto, SocialInteractionDto, SocialInteractionResponseDto, DrawCatWithTicketsDto, DrawCatTraditionalDto, DrawStatsDto } from './dto/cat-nft.dto';
// 临时枚举定义，直到Prisma客户端完全生成
enum TransactionType {
    SEND = 'SEND',
    RECEIVE = 'RECEIVE',
    INITIAL_FUND = 'INITIAL_FUND',
    DOMAIN_NFT_MINT = 'DOMAIN_NFT_MINT',
    CAT_NFT_MINT = 'CAT_NFT_MINT',
    DOMAIN_REG = 'DOMAIN_REG',
    SWAP = 'SWAP',
    STAKE = 'STAKE',
    UNSTAKE = 'UNSTAKE'
}

enum TxStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

@Injectable()
export class NFCService {
    private readonly logger = new Logger(NFCService.name);

    constructor(
        private prisma: PrismaService,
        private cryptoService: CryptoService,
        private injectiveService: InjectiveService,
        private transactionService: TransactionService,
    ) { }

    /**
     * 解密用户私钥的工具函数
     */
    private async decryptUserPrivateKey(encryptedPrivateKey: string): Promise<string> {
        try {
            return this.cryptoService.decrypt(encryptedPrivateKey);
        } catch (error) {
            this.logger.error('私钥解密失败:', error.message);
            throw new BadRequestException('用户私钥解密失败');
        }
    }

    /**
     * 自动绑定NFC到合约的辅助函数
     */
    private async bindNFCToContract(user: any, uid: string): Promise<void> {
        try {
            // 调用合约绑定函数，传递用户的以太坊地址
            const bindResult = await this.injectiveService.detectAndBindBlankCard(
                uid,
                user.ethAddress // 传递用户的以太坊地址，而不是私钥
            );

            if (bindResult.success) {
                this.logger.log(`NFC卡片已自动绑定到合约: ${uid} -> ${user.address}`);
            } else {
                this.logger.error(`NFC自动绑定失败: ${bindResult.error}`);
            }
        } catch (error) {
            this.logger.error(`NFC自动绑定过程中出现错误:`, error.message);
        }
    }

    /**
     * 注册NFC卡片并创建或绑定到用户钱包（一一对应关系）
     */
    async registerNFC(registerNFCDto: RegisterNFCDto): Promise<WalletResponseDto> {
        const { uid, userAddress, nickname } = registerNFCDto;

        // 验证UID格式
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        // 检查NFC卡片是否已存在
        const existingCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: { user: true }
        });

        if (existingCard) {
            // 返回已存在的卡片信息
            return this.buildWalletResponse(existingCard.user, existingCard, false);
        }

        let user;

        if (userAddress) {
            // 绑定到现有用户
            user = await this.prisma.user.findUnique({
                where: { address: userAddress },
                include: { nfcCard: true, transactions: { take: 5, orderBy: { createdAt: 'desc' } } }
            });

            if (!user) {
                throw new NotFoundException('指定的用户地址不存在');
            }

            // 检查用户是否已经绑定其他NFC卡片
            if (user.nfcCard) {
                throw new ConflictException('该用户已绑定其他NFC卡片，无法绑定新卡片');
            }
        } else {
            // 创建新用户
            const wallet = await this.cryptoService.generateWallet();
            const encryptedPrivateKey = await this.cryptoService.encryptData(wallet.privateKey);

            user = await this.prisma.user.create({
                data: {
                    address: wallet.address,
                    ethAddress: wallet.ethAddress,
                    publicKey: wallet.publicKey,
                    privateKeyEnc: encryptedPrivateKey,
                },
                include: { nfcCard: true, transactions: { take: 5, orderBy: { createdAt: 'desc' } } }
            });

            this.logger.log(`新建用户钱包: ${user.address} for UID: ${uid}`);

            // 同步发送初始资金，确保用户注册完成时就有资金
            try {
                await this.initializeNewUser(user.id, user.address);
                this.logger.log(`用户初始化完成: ${user.address}`);
            } catch (error) {
                this.logger.error(`初始化用户失败 ${user.address}:`, error.message);
                // 不阻止注册流程，但记录错误
            }
        }

        // 验证和截断昵称长度
        let validNickname = nickname;
        if (validNickname && validNickname.length > 100) {
            validNickname = validNickname.substring(0, 100);
            this.logger.warn(`昵称过长已截断: ${nickname.length} -> 100 字符`);
        }

        // 创建NFC卡片记录（一一对应）
        const nfcCard = await this.prisma.nFCCard.create({
            data: {
                uid,
                userId: user.id,
                nickname: validNickname,
                isActive: true,
                isBlank: true, // 初始为空白卡片
            },
            include: { user: true }
        });

        this.logger.log(`NFC卡片注册成功: ${uid} -> ${user.address}`);

        // 同步绑定NFC到合约，确保绑定成功
        try {
            await this.bindNFCToContract(user, uid);
        } catch (error) {
            this.logger.error(`自动绑定NFC到合约失败 ${uid}:`, error.message);
            // 不抛出错误，允许用户继续使用，但记录失败
        }

        return this.buildWalletResponse(user, nfcCard, true);
    }

    /**
     * 根据NFC UID获取钱包信息
     */
    async getWalletByUID(uid: string): Promise<WalletResponseDto | null> {
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: {
                user: {
                    include: {
                        transactions: { take: 5, orderBy: { createdAt: 'desc' } }
                    }
                }
            }
        });

        if (!nfcCard) {
            return null;
        }

        return this.buildWalletResponse(nfcCard.user, nfcCard, false);
    }

    /**
     * 绑定NFC卡片到现有用户（一一对应关系）
     */
    async bindNFCCard(bindNFCDto: BindNFCDto): Promise<{ success: boolean; message: string }> {
        const { uid, userAddress } = bindNFCDto;

        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        // 检查NFC卡片是否已存在
        const existingCard = await this.prisma.nFCCard.findUnique({
            where: { uid }
        });

        if (existingCard) {
            throw new ConflictException('NFC卡片已被绑定');
        }

        // 检查用户是否存在
        const user = await this.prisma.user.findUnique({
            where: { address: userAddress },
            include: { nfcCard: true }
        });

        if (!user) {
            throw new NotFoundException('用户不存在');
        }

        // 检查用户是否已经绑定其他NFC卡片
        if (user.nfcCard) {
            throw new ConflictException('该用户已绑定其他NFC卡片');
        }

        // 创建绑定关系
        await this.prisma.nFCCard.create({
            data: {
                uid,
                userId: user.id,
                isActive: true,
                isBlank: false, // 绑定到现有用户，不是空白卡片
            }
        });

        this.logger.log(`NFC卡片绑定成功: ${uid} -> ${userAddress}`);

        return {
            success: true,
            message: 'NFC卡片绑定成功'
        };
    }

    /**
     * 手动绑定NFC到合约（修复绑定失败的情况）
     */
    async manualBindNFCToContract(uid: string): Promise<{ success: boolean; message: string; transactionHash?: string }> {
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        // 查找NFC对应的用户
        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: { user: true }
        });

        if (!nfcCard) {
            throw new NotFoundException('NFC卡片不存在，请先注册');
        }

        try {
            // 调用合约绑定函数
            const bindResult = await this.injectiveService.detectAndBindBlankCard(
                uid,
                nfcCard.user.ethAddress
            );

            if (bindResult.success) {
                this.logger.log(`手动绑定NFC到合约成功: ${uid} -> ${nfcCard.user.address}`);
                return {
                    success: true,
                    message: 'NFC成功绑定到合约',
                    transactionHash: bindResult.txHash
                };
            } else {
                throw new Error(bindResult.error || '绑定失败');
            }
        } catch (error) {
            this.logger.error(`手动绑定NFC到合约失败 ${uid}:`, error.message);
            throw new BadRequestException(`绑定失败: ${error.message}`);
        }
    }

    /**
     * 注册域名NFT（需要初始资金且与NFC绑定）
     */
    async registerDomainNFT(registerDomainDto: RegisterDomainDto): Promise<DomainNFTResponseDto> {
        const { uid, domainPrefix } = registerDomainDto;

        if (!this.validateUID(uid)) { throw new BadRequestException('NFC UID格式无效'); }
        if (!this.validateDomainSuffix(domainPrefix)) { throw new BadRequestException('域名后缀格式无效'); }

        // 生成完整域名：advx-{suffix}.inj (与合约逻辑一致)
        const fullDomain = `advx-${domainPrefix}.inj`;
        const existingDomain = await this.prisma.user.findUnique({ where: { domain: fullDomain } });
        if (existingDomain) { throw new ConflictException('域名已被占用'); }

        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: { user: true }
        });
        if (!nfcCard) { throw new NotFoundException('未找到对应的NFC卡片'); }
        if (nfcCard.user.domain) { throw new ConflictException('用户已拥有域名'); }
        if (!nfcCard.user.initialFunded) { throw new BadRequestException('用户尚未获得初始资金，无法注册域名'); }

        try {
            const domainTokenId = `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // 解密用户私钥
            const userPrivateKey = await this.decryptUserPrivateKey(nfcCard.user.privateKeyEnc);

            const mintResult = await this.injectiveService.mintDomainNFT(
                nfcCard.user.address,
                fullDomain,
                uid, // Pass NFC UID to mintDomainNFT
                domainTokenId,
                userPrivateKey // 使用用户私钥进行身份验证
            );

            if (!mintResult.success) { throw new Error(`域名NFT铸造失败: ${mintResult.error}`); }

            await this.prisma.user.update({
                where: { id: nfcCard.user.id },
                data: {
                    domain: fullDomain,
                    domainTokenId: domainTokenId,
                    domainRegistered: true
                }
            });

            await this.transactionService.createTransaction({
                txHash: mintResult.txHash,
                userId: nfcCard.user.id,
                type: TransactionType.DOMAIN_NFT_MINT,
                amount: '0',
                tokenSymbol: 'INJ',
                fromAddress: nfcCard.user.address,
                toAddress: nfcCard.user.address,
                memo: `域名NFT铸造: ${fullDomain}`,
                rawTx: mintResult.rawTx
            });

            this.logger.log(`域名NFT注册成功: ${fullDomain} for UID: ${uid}`);
            return { domain: fullDomain, tokenId: domainTokenId, txHash: mintResult.txHash, registeredAt: new Date() };
        } catch (error) {
            this.logger.error(`域名NFT注册失败:`, error.message);
            throw new BadRequestException(`域名NFT注册失败: ${error.message}`);
        }
    }

    /**
     * 检查域名可用性
     */
    async checkDomainAvailability(domainSuffix: string): Promise<DomainAvailabilityDto> {
        if (!this.validateDomainSuffix(domainSuffix)) {
            throw new BadRequestException('域名后缀格式无效');
        }

        // 生成完整域名：advx-{suffix}.inj (与合约逻辑一致)
        const fullDomain = `advx-${domainSuffix}.inj`;
        const existingUser = await this.prisma.user.findUnique({
            where: { domain: fullDomain }
        });

        return {
            domain: fullDomain,
            available: !existingUser,
            ownerAddress: existingUser?.address || null
        };
    }

    /**
     * 获取钱包余额
     */
    async getWalletBalance(address: string): Promise<{
        inj: string;
        usd?: string;
    }> {
        try {
            // 调用Injective服务获取余额
            const balanceResult = await this.injectiveService.getAccountBalance(address);

            return {
                inj: balanceResult.inj || '0',
                usd: balanceResult.usd || undefined // USD估值可以通过价格API获取
            };
        } catch (error) {
            this.logger.error(`获取钱包余额失败 ${address}:`, error.message);
            throw new BadRequestException('获取钱包余额失败');
        }
    }

    /**
     * 获取钱包统计信息
     */
    async getWalletStats(): Promise<{
        totalWallets: number;
        walletsWithDomain: number;
        walletsWithNFT: number;
        fundedWallets: number;
        recentRegistrations: number;
    }> {
        const [
            totalWallets,
            walletsWithDomain,
            fundedWallets,
            recentRegistrations
        ] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { domainRegistered: true } }),
            this.prisma.user.count({ where: { initialFunded: true } }),
            this.prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
                    }
                }
            })
        ]);

        // 统计有NFT的钱包数量
        const walletsWithNFT = await this.prisma.user.count({
            where: {
                OR: [
                    { domainRegistered: true },
                    { catNFTs: { some: {} } }
                ]
            }
        });

        return {
            totalWallets,
            walletsWithDomain,
            walletsWithNFT,
            fundedWallets,
            recentRegistrations
        };
    }

    /**
     * 解绑NFC卡片
     */
    async unbindNFC(uid: string): Promise<{ success: boolean; message: string }> {
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: { user: true }
        });

        if (!nfcCard) {
            throw new NotFoundException('NFC卡片不存在');
        }

        // 检查用户是否拥有域名，如果有域名则不允许解绑
        if (nfcCard.user.domain) {
            throw new BadRequestException('用户已拥有域名，无法解绑NFC卡片');
        }

        // 删除NFC卡片记录
        await this.prisma.nFCCard.delete({
            where: { uid }
        });

        this.logger.log(`NFC卡片解绑成功: ${uid}`);

        return {
            success: true,
            message: 'NFC卡片解绑成功'
        };
    }

    /**
     * 初始化新用户（发送初始资金）
     */
    private async initializeNewUser(userId: number, address: string): Promise<void> {
        try {
            const amount = '0.1'; // 0.1 INJ

            // 获取用户信息
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new Error('用户不存在');
            }

            // 发送到 Injective 地址（inj），银行模块要求 bech32 地址
            console.log(`发送初始资金到 Injective 地址: ${user.address}`);
            const result = await this.injectiveService.sendInjectiveTokens(user.address, amount);

            if (result.success) {
                await this.prisma.user.update({
                    where: { id: userId },
                    data: { initialFunded: true }
                });

                await this.transactionService.createTransaction({
                    txHash: result.txHash,
                    userId,
                    type: TransactionType.INITIAL_FUND,
                    amount,
                    tokenSymbol: 'INJ',
                    fromAddress: process.env.MASTER_WALLET_ADDRESS,
                    toAddress: address,
                    memo: '初始资金',
                    rawTx: result.rawTx
                });

                this.logger.log(`初始资金发送成功: ${address} -> ${amount} INJ`);
            } else {
                this.logger.error(`初始资金发送失败: ${result.error}`);
            }
        } catch (error) {
            this.logger.error(`初始化用户失败: ${error.message}`);
        }
    }

    /**
     * 构建钱包响应
     */
    private buildWalletResponse(
        user: any,
        nfcCard: any,
        isNewWallet: boolean
    ): WalletResponseDto {
        const recentTransactions = user.transactions?.map((tx: any) => ({
            txHash: tx.txHash,
            type: tx.type,
            amount: tx.amount,
            tokenSymbol: tx.tokenSymbol,
            status: tx.status,
            createdAt: tx.createdAt
        })) || [];

        return {
            address: user.address,
            ethAddress: user.ethAddress,
            domain: user.domain,
            domainTokenId: user.domainTokenId,
            initialFunded: user.initialFunded,
            domainRegistered: user.domainRegistered,
            nfcCard: nfcCard ? {
                uid: nfcCard.uid,
                nickname: nfcCard.nickname,
                isActive: nfcCard.isActive,
                isBlank: nfcCard.isBlank
            } : null,
            recentTransactions,
            isNewWallet
        };
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
        return this.injectiveService.getContractStatus();
    }

    /**
     * 验证NFC UID格式
     */
    private validateUID(uid: string): boolean {
        // 支持多种NFC UID格式
        const patterns = [
            /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, // 4字节格式
            /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, // 7字节格式
            /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, // 8字节格式
            /^[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]+$/ // 8字节+扩展格式
        ];

        return patterns.some(pattern => pattern.test(uid));
    }

    /**
     * 验证域名格式
     */
    private validateDomain(domain: string): boolean {
        const regex = /^[a-z0-9]+([a-z0-9-]*[a-z0-9])?\.inj$/;
        return domain.length >= 4 && domain.length <= 35 && regex.test(domain);
    }

    /**
     * 验证域名后缀格式 (与合约_isValidDomainSuffix逻辑一致)
     */
    private validateDomainSuffix(domainSuffix: string): boolean {
        if (!domainSuffix || typeof domainSuffix !== 'string') {
            return false;
        }

        // 长度检查：1-25字符 (合约MAX_DOMAIN_LENGTH=30，减去advx-的5字符)
        if (domainSuffix.length < 1 || domainSuffix.length > 25) {
            return false;
        }

        // 字符检查：只允许小写字母、数字、连字符
        const regex = /^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/;
        if (!regex.test(domainSuffix)) {
            return false;
        }

        // 不能有连续连字符
        if (domainSuffix.includes('--')) {
            return false;
        }

        return true;
    }

    /**
     * 验证域名前缀格式 (保留旧方法以兼容现有代码)
     * @deprecated 使用 validateDomainSuffix 代替
     */
    private validateDomainPrefix(domainPrefix: string): boolean {
        return this.validateDomainSuffix(domainPrefix);
    }



    /**
     * 社交互动获取抽卡次数
     */
    async socialInteraction(socialInteractionDto: SocialInteractionDto): Promise<SocialInteractionResponseDto> {
        const { myNFC, otherNFC } = socialInteractionDto;

        if (!this.validateUID(myNFC)) {
            throw new BadRequestException('自己的NFC UID格式无效');
        }
        if (!this.validateUID(otherNFC)) {
            throw new BadRequestException('其他NFC UID格式无效');
        }
        if (myNFC === otherNFC) {
            throw new BadRequestException('不能与自己的NFC卡片互动');
        }

        // 查找自己的NFC卡片和用户
        const myNfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid: myNFC },
            include: { user: true }
        });

        if (!myNfcCard) {
            throw new NotFoundException('未找到自己的NFC卡片');
        }

        // 查找其他用户的NFC卡片
        const otherNfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid: otherNFC },
            include: { user: true }
        });

        if (!otherNfcCard) {
            throw new NotFoundException('未找到其他用户的NFC卡片');
        }

        try {
            // 解密用户私钥
            const userPrivateKey = await this.decryptUserPrivateKey(myNfcCard.user.privateKeyEnc);

            // 检查用户授权状态
            const isAuthorized = await this.injectiveService.checkUserAuthorization(myNfcCard.user.ethAddress);
            if (!isAuthorized) {
                this.logger.warn(`用户 ${myNfcCard.user.ethAddress} 未获得授权，尝试手动授权`);
                const authResult = await this.injectiveService.authorizeUser(myNfcCard.user.ethAddress);
                if (!authResult.success) {
                    throw new Error(`用户授权失败: ${authResult.error}`);
                }
                this.logger.log(`用户 ${myNfcCard.user.ethAddress} 授权成功`);
            }

            // 调用合约进行社交互动
            const interactionResult = await this.injectiveService.socialInteraction(
                myNFC,
                otherNFC,
                userPrivateKey // 使用用户私钥进行身份验证
            );

            if (!interactionResult.success) {
                throw new Error(`社交互动失败: ${interactionResult.error}`);
            }

            this.logger.log(`社交互动成功: ${myNFC} 与 ${otherNFC} 互动，获得抽卡券`);

            return {
                transactionHash: interactionResult.txHash,
                rewardTickets: interactionResult.rewardTickets || 1,
                totalTickets: interactionResult.totalTickets || 1,
                message: '社交互动成功，获得1张抽卡券'
            };
        } catch (error) {
            this.logger.error(`社交互动失败:`, error.message);
            throw new BadRequestException(`社交互动失败: ${error.message}`);
        }
    }

    /**
     * 使用抽卡券抽取猫咪NFT
     */
    async drawCatWithTickets(drawCatWithTicketsDto: DrawCatWithTicketsDto): Promise<CatNFTResponseDto> {
        const { nfcUid, catName } = drawCatWithTicketsDto;

        if (!this.validateUID(nfcUid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        // 查找NFC卡片和用户
        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid: nfcUid },
            include: { user: true }
        });

        if (!nfcCard) {
            throw new NotFoundException('未找到NFC卡片');
        }

        if (!nfcCard.user.initialFunded) {
            throw new BadRequestException('用户尚未获得初始资金，无法抽卡');
        }

        try {
            // 解密用户私钥
            const userPrivateKey = await this.decryptUserPrivateKey(nfcCard.user.privateKeyEnc);

            // 调用合约使用抽卡券抽卡
            const mintResult = await this.injectiveService.drawCatNFTWithTickets(
                nfcCard.user.address,
                nfcUid,
                catName,
                userPrivateKey // 使用用户私钥进行身份验证
            );

            if (!mintResult.success) {
                throw new Error(`抽卡失败: ${mintResult.error}`);
            }

            // 根据颜色生成图片URL
            const imageUrl = this.generateCatImageUrl(mintResult.color);

            // 保存到数据库（处理可能的tokenId唯一性冲突）
            let tokenIdToSave = mintResult.rawTx?.tokenId || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            let catNFT;
            try {
                catNFT = await this.prisma.catNFT.create({
                    data: {
                        tokenId: tokenIdToSave,
                        userId: nfcCard.user.id,
                        name: catName,
                        rarity: mintResult.rarity as any,
                        color: mintResult.color,
                        imageUrl: imageUrl,
                        metadata: {
                            rarity: mintResult.rarity,
                            color: mintResult.color,
                            description: `A ${mintResult.color} cat with ${mintResult.rarity} rarity`,
                            drawMethod: 'tickets',
                            drawCount: mintResult.drawCount || 0
                        }
                    }
                });
            } catch (e: any) {
                if (e?.code === 'P2002') {
                    // 发生唯一约束冲突，追加唯一后缀再保存
                    tokenIdToSave = `${tokenIdToSave}_${Date.now()}`;
                    catNFT = await this.prisma.catNFT.create({
                        data: {
                            tokenId: tokenIdToSave,
                            userId: nfcCard.user.id,
                            name: catName,
                            rarity: mintResult.rarity as any,
                            color: mintResult.color,
                            imageUrl: imageUrl,
                            metadata: {
                                rarity: mintResult.rarity,
                                color: mintResult.color,
                                description: `A ${mintResult.color} cat with ${mintResult.rarity} rarity`,
                                drawMethod: 'tickets',
                                drawCount: mintResult.drawCount || 0
                            }
                        }
                    });
                } else {
                    throw e;
                }
            }

            // 记录交易
            await this.transactionService.createTransaction({
                txHash: mintResult.txHash,
                userId: nfcCard.user.id,
                type: TransactionType.CAT_NFT_MINT,
                amount: '0.1', // 手续费
                tokenSymbol: 'INJ',
                fromAddress: nfcCard.user.address,
                toAddress: nfcCard.user.address,
                memo: `使用抽卡券抽卡: ${catName}`,
                rawTx: mintResult.rawTx
            });

            this.logger.log(`使用抽卡券抽卡成功: ${catName} -> ${nfcCard.user.address}, Rarity: ${mintResult.rarity}, Color: ${mintResult.color}`);

            return {
                tokenId: catNFT.tokenId,
                name: catNFT.name,
                rarity: catNFT.rarity,
                color: catNFT.color,
                imageUrl: catNFT.imageUrl,
                metadata: catNFT.metadata as Record<string, any>,
                txHash: mintResult.txHash,
                mintedAt: catNFT.mintedAt
            };
        } catch (error) {
            this.logger.error(`使用抽卡券抽卡失败:`, error.message);
            throw new BadRequestException(`抽卡失败: ${error.message}`);
        }
    }

    /**
     * 传统付费抽卡 (已禁用 - 合约功能已移除)
     */
    async drawCatTraditional(drawCatTraditionalDto: DrawCatTraditionalDto): Promise<CatNFTResponseDto> {
        // 此功能已禁用，因为合约中的 drawCatNFTTraditional 函数已被移除
        throw new BadRequestException('传统付费抽卡功能暂时不可用，请使用抽卡券抽卡');
    }

    /**
     * 获取NFC抽卡统计信息
     */
    async getDrawStats(nfcUID: string): Promise<DrawStatsDto> {
        if (!this.validateUID(nfcUID)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        try {
            // 调用合约获取抽卡统计
            const stats = await this.injectiveService.getDrawStats(nfcUID);

            return {
                availableDraws: stats.availableDraws || 0,
                usedDraws: stats.usedDraws || 0,
                totalDraws: stats.totalDraws || 0,
                socialBonus: stats.socialBonus || 0
            };
        } catch (error) {
            this.logger.error(`获取抽卡统计失败:`, error.message);
            throw new BadRequestException(`获取抽卡统计失败: ${error.message}`);
        }
    }

    /**
     * 获取已互动的NFC列表
     */
    async getInteractedNFCs(nfcUID: string): Promise<{ interactedNFCs: string[] }> {
        if (!this.validateUID(nfcUID)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        try {
            // 调用合约获取已互动NFC列表
            const interactedNFCs = await this.injectiveService.getInteractedNFCs(nfcUID);

            return {
                interactedNFCs: interactedNFCs || []
            };
        } catch (error) {
            this.logger.error(`获取已互动NFC列表失败:`, error.message);
            throw new BadRequestException(`获取已互动NFC列表失败: ${error.message}`);
        }
    }

    /**
     * 获取用户的小猫NFT列表
     */
    async getUserCatNFTs(uid: string): Promise<CatNFTListDto> {
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: {
                user: {
                    include: {
                        catNFTs: {
                            orderBy: { mintedAt: 'desc' }
                        }
                    }
                }
            }
        });

        if (!nfcCard) {
            throw new NotFoundException('未找到NFC卡片');
        }

        const catNFTs = nfcCard.user.catNFTs.map(cat => ({
            tokenId: cat.tokenId,
            name: cat.name,
            rarity: cat.rarity,
            color: cat.color,
            imageUrl: cat.imageUrl,
            metadata: cat.metadata as Record<string, any>,
            txHash: (cat.metadata as any)?.txHash || cat.tokenId, // 使用txHash或tokenId作为fallback
            mintedAt: cat.mintedAt
        }));

        return {
            cats: catNFTs,
            total: catNFTs.length,
            page: 1,
            totalPages: 1
        };
    }

    /**
     * 获取社交统计信息
     */
    async getSocialStats(uid: string): Promise<SocialStatsDto> {
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        try {
            // 获取抽卡统计
            const drawStats = await this.getDrawStats(uid);

            // 获取已互动NFC列表
            const interactedResult = await this.getInteractedNFCs(uid);

            return {
                nfcUID: uid,
                drawCount: drawStats.usedDraws,
                interactedCount: interactedResult.interactedNFCs.length,
                interactedNFCs: interactedResult.interactedNFCs,
                socialBonus: drawStats.socialBonus
            };
        } catch (error) {
            this.logger.error(`获取社交统计失败:`, error.message);
            throw new BadRequestException(`获取社交统计失败: ${error.message}`);
        }
    }

    /**
     * 检查两个NFC是否已经互动过
     */
    async checkInteraction(nfc1: string, nfc2: string): Promise<boolean> {
        if (!this.validateUID(nfc1) || !this.validateUID(nfc2)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        try {
            return await this.injectiveService.hasInteracted(nfc1, nfc2);
        } catch (error) {
            this.logger.error(`检查NFC互动状态失败:`, error.message);
            return false;
        }
    }

    /**
     * 根据颜色生成猫咪图片URL
     */
    private generateCatImageUrl(color: string): string {
        const colorMapping = {
            '橙色': 'https://bafybeifm2mxuyfdituhty23ejoeojp23mpbyavsufg5hb2vwsxjftfzplu.ipfs.w3s.link/',
            '绿色': 'https://bafybeifgbuvorq2o6uztzg3ekf2m3lezu2fh65aydttuavs2thy63zauja.ipfs.w3s.link/',
            '黑色': 'https://bafybeieljhlspz52bir4cor4p3ww5zlo7ifyzdf2givip635kxgwpgnhmq.ipfs.w3s.link/',
            '紫色': 'https://bafybeibmuw3eypvh4p5k33pquhkxmt7cktuobtjk7cm5fqgz2dl2ewpr24.ipfs.w3s.link/',
            '红色': 'https://bafybeiedm7slz2lszetnakzddshedf3oirgy2iqfvykzpx5qxp3kji4xpi.ipfs.w3s.link/',
            '蓝色': 'https://bafybeibirtf5cu6kacoukvplxneodjrak5dvpbi3pepjatwhjijyl5xca4.ipfs.w3s.link/',
            '彩虹': 'https://bafybeibirtf5cu6kacoukvplxneodjrak5dvpbi3pepjatwhjijyl5xca4.ipfs.w3s.link/'
        };

        return colorMapping[color] || colorMapping['黑色']; // 默认返回黑色猫咪URL
    }
}