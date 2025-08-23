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
import { DrawCatNFTDto, CatNFTResponseDto, CatNFTListDto, SocialStatsDto } from './dto/cat-nft.dto';
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

            // 发送初始资金
            this.initializeNewUser(user.id, user.address).catch(error => {
                this.logger.error(`初始化用户失败 ${user.address}:`, error.message);
            });
        }

        // 创建NFC卡片记录（一一对应）
        const nfcCard = await this.prisma.nFCCard.create({
            data: {
                uid,
                userId: user.id,
                nickname,
                isActive: true,
                isBlank: true, // 初始为空白卡片
            },
            include: { user: true }
        });

        this.logger.log(`NFC卡片注册成功: ${uid} -> ${user.address}`);

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
     * 注册域名NFT（需要初始资金且与NFC绑定）
     */
    async registerDomainNFT(registerDomainDto: RegisterDomainDto): Promise<DomainNFTResponseDto> {
        const { uid, domainPrefix } = registerDomainDto;

        if (!this.validateUID(uid)) { throw new BadRequestException('NFC UID格式无效'); }
        if (!this.validateDomainPrefix(domainPrefix)) { throw new BadRequestException('域名前缀格式无效'); }

        const fullDomain = `${domainPrefix}.inj`;
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
            const mintResult = await this.injectiveService.mintDomainNFT(
                nfcCard.user.address,
                fullDomain,
                uid, // Pass NFC UID to mintDomainNFT
                domainTokenId
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
    async checkDomainAvailability(domainPrefix: string): Promise<DomainAvailabilityDto> {
        if (!this.validateDomainPrefix(domainPrefix)) {
            throw new BadRequestException('域名前缀格式无效');
        }

        const fullDomain = `${domainPrefix}.inj`;
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
            const result = await this.injectiveService.sendInjectiveTokens(address, amount);

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
     * 验证域名前缀格式
     */
    private validateDomainPrefix(domainPrefix: string): boolean {
        const regex = /^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/;
        return domainPrefix.length >= 3 &&
            domainPrefix.length <= 30 &&
            regex.test(domainPrefix) &&
            !domainPrefix.includes('--');
    }

    /**
     * 社交抽卡获得小猫NFT
     */
    async drawCatNFT(drawCatNFTDto: DrawCatNFTDto): Promise<CatNFTResponseDto> {
        const { myNFC, otherNFC, catName } = drawCatNFTDto;

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

        // 查找其他用户的NFC卡片（验证其他NFC确实存在且已注册）
        const otherNfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid: otherNFC },
            include: { user: true }
        });

        if (!otherNfcCard) {
            throw new NotFoundException('未找到其他用户的NFC卡片');
        }

        if (!myNfcCard.user.initialFunded) {
            throw new BadRequestException('用户尚未获得初始资金，无法抽卡');
        }

        // 检查用户是否已有同名小猫
        const existingCat = await this.prisma.catNFT.findFirst({
            where: {
                userId: myNfcCard.user.id,
                name: catName
            }
        });

        if (existingCat) {
            throw new ConflictException('小猫名称已被使用');
        }

        try {
            // 调用合约进行社交抽卡
            const mintResult = await this.injectiveService.socialMintCatNFT(
                myNfcCard.user.address,
                myNFC,
                otherNFC,
                catName
            );

            if (!mintResult.success) {
                throw new Error(`社交抽卡失败: ${mintResult.error}`);
            }

            // 根据颜色生成图片URL
            const imageUrl = this.generateCatImageUrl(mintResult.color);

            // 保存到数据库
            const catNFT = await this.prisma.catNFT.create({
                data: {
                    tokenId: mintResult.rawTx.tokenId,
                    userId: myNfcCard.user.id,
                    name: catName,
                    rarity: mintResult.rarity as any, // 转换为Prisma枚举
                    color: mintResult.color,
                    imageUrl: imageUrl,
                    metadata: {
                        rarity: mintResult.rarity,
                        color: mintResult.color,
                        description: `A ${mintResult.color} cat with ${mintResult.rarity} rarity`,
                        socialDraw: true,
                        interactedWith: otherNFC,
                        drawCount: mintResult.drawCount || 0
                    }
                }
            });

            // 记录交易
            await this.transactionService.createTransaction({
                txHash: mintResult.txHash,
                userId: myNfcCard.user.id,
                type: TransactionType.CAT_NFT_MINT,
                amount: '0.1', // 抽卡费用
                tokenSymbol: 'INJ',
                fromAddress: myNfcCard.user.address,
                toAddress: myNfcCard.user.address,
                memo: `社交抽卡: ${catName} (与 ${otherNFC} 互动)`,
                rawTx: mintResult.rawTx
            });

            this.logger.log(`社交抽卡成功: ${catName} -> ${myNfcCard.user.address}, Rarity: ${mintResult.rarity}, Color: ${mintResult.color}, 互动NFC: ${otherNFC}`);

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
            this.logger.error(`社交抽卡失败:`, error.message);
            throw new BadRequestException(`社交抽卡失败: ${error.message}`);
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
            include: { user: true }
        });

        if (!nfcCard) {
            throw new NotFoundException('未找到对应的NFC卡片');
        }

        const catNFTs = await this.prisma.catNFT.findMany({
            where: { userId: nfcCard.user.id },
            orderBy: { mintedAt: 'desc' }
        });

        const cats = catNFTs.map(cat => ({
            tokenId: cat.tokenId,
            name: cat.name,
            rarity: cat.rarity,
            color: cat.color,
            imageUrl: cat.imageUrl,
            metadata: cat.metadata as Record<string, any>,
            txHash: '', // 这里可以从交易记录中获取
            mintedAt: cat.mintedAt
        }));

        return {
            cats,
            total: cats.length,
            page: 1,
            totalPages: 1
        };
    }

    /**
     * 获取NFC的社交统计信息
     */
    async getSocialStats(uid: string): Promise<SocialStatsDto> {
        if (!this.validateUID(uid)) {
            throw new BadRequestException('NFC UID格式无效');
        }

        const nfcCard = await this.prisma.nFCCard.findUnique({
            where: { uid },
            include: { user: true }
        });

        if (!nfcCard) {
            throw new NotFoundException('未找到对应的NFC卡片');
        }

        try {
            // 从合约获取社交统计信息
            const socialData = await this.injectiveService.getSocialStats(uid);

            return {
                nfcUID: uid,
                drawCount: socialData.drawCount || 0,
                interactedCount: socialData.interactedNFCs?.length || 0,
                interactedNFCs: socialData.interactedNFCs || [],
                socialBonus: socialData.socialBonus || 0
            };
        } catch (error) {
            this.logger.error(`获取社交统计失败 ${uid}:`, error.message);
            // 返回默认值
            return {
                nfcUID: uid,
                drawCount: 0,
                interactedCount: 0,
                interactedNFCs: [],
                socialBonus: 0
            };
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
            this.logger.error(`检查NFC互动状态失败 ${nfc1} <-> ${nfc2}:`, error.message);
            return false;
        }
    }

    /**
     * 生成小猫图片URL
     */
    private generateCatImageUrl(color: string): string {
        // 这里可以根据颜色返回对应的图片URL
        // 在实际部署时，这些图片应该上传到IPFS或其他存储服务
        const imageMap = {
            'black': 'https://example.com/images/cats/black-cat.png',
            'green': 'https://example.com/images/cats/green-cat.png',
            'red': 'https://example.com/images/cats/red-cat.png',
            'orange': 'https://example.com/images/cats/orange-cat.png',
            'purple': 'https://example.com/images/cats/purple-cat.png',
            'blue': 'https://example.com/images/cats/blue-cat.png',
            'rainbow': 'https://example.com/images/cats/rainbow-cat.png'
        };

        return imageMap[color] || 'https://example.com/images/cats/default-cat.png';
    }
}