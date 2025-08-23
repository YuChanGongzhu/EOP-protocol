export type WalletResponse = {
    address: string;
    ethAddress: string;
    domain: string | null;
    domainTokenId: string | null;
    initialFunded: boolean;
    domainRegistered: boolean;
    nfcCard: {
        uid: string;
        nickname?: string | null;
        isActive: boolean;
        isBlank: boolean;
    } | null;
    recentTransactions: Array<{
        txHash: string;
        type: string;
        amount: string | null;
        tokenSymbol: string | null;
        status: string;
        createdAt: string;
    }>;
    isNewWallet: boolean;
};

export type DomainAvailability = {
    available: boolean;
    domain: string;
    ownerAddress: string | null;
};

export type SocialInteractionResp = {
    transactionHash: string;
    rewardTickets: number;
    totalTickets: number;
    message: string;
};

export type CatNFT = {
    tokenId: string;
    name: string;
    rarity: 'R' | 'SR' | 'SSR' | 'UR';
    color: string;
    imageUrl: string;
    metadata?: Record<string, unknown>;
    txHash?: string;
    mintedAt: string;
};

export type CatListResp = { cats: CatNFT[]; total: number; page?: number; totalPages?: number };

export type DrawStats = {
    availableDraws: number;
    usedDraws: number;
    totalDraws: number;
    socialBonus: number;
};
