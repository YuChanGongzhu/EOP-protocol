// 合约参数验证和常量定义
// 这个文件确保API参数与智能合约要求保持一致

export const CONTRACT_CONSTANTS = {
    // 小猫NFT合约常量
    CAT_NFT: {
        MAX_CATS_PER_USER: 1770,
        DRAW_FEE: '0.1', // INJ
        MAX_CAT_NAME_LENGTH: 100,

        // 稀有度概率 (总计10000)
        RARITY_PROBABILITIES: {
            R: 6000,   // 60%
            SR: 3000,  // 30% 
            SSR: 900,  // 9%
            UR: 100    // 1%
        },

        // 社交奖励参数
        SOCIAL_BONUS_THRESHOLD: 10, // 每10次互动增加奖励
        SOCIAL_BONUS_RATE: 1, // 1%增加
    },

    // 域名NFT合约常量 - 与合约完全一致
    DOMAIN_NFT: {
        MIN_DOMAIN_LENGTH: 1,     // 合约 MIN_DOMAIN_LENGTH
        MAX_DOMAIN_LENGTH: 25,    // 合约 MAX_DOMAIN_LENGTH(30) - advx-(5) = 25
        DOMAIN_PREFIX: 'advx-',   // 合约自动添加的前缀
        DOMAIN_SUFFIX: '.inj',    // 合约自动添加的后缀
        // 合约规则：只允许小写字母、数字、连字符，不能以连字符开头/结尾，不能连续连字符
        DOMAIN_REGEX: /^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/,
        REGISTRATION_FEE: '0', // 免费注册 (测试网)
    },

    // NFC钱包注册表常量
    NFC_REGISTRY: {
        MAX_UID_LENGTH: 255,
        MIN_UID_LENGTH: 1,
        INITIAL_FUNDING: '0.1', // INJ
    },

    // 网络配置
    NETWORK: {
        CHAIN_ID: 1439,
        RPC_URL: 'https://k8s.testnet.json-rpc.injective.network/',
        BLOCK_EXPLORER: 'https://testnet.blockscout.injective.network/',
    }
} as const;

// 参数验证函数
export class ContractValidator {

    /**
     * 验证小猫名称
     */
    static validateCatName(catName: string): { valid: boolean; error?: string } {
        if (!catName || catName.trim().length === 0) {
            return { valid: false, error: '小猫名称不能为空' };
        }

        if (catName.length > CONTRACT_CONSTANTS.CAT_NFT.MAX_CAT_NAME_LENGTH) {
            return {
                valid: false,
                error: `小猫名称长度不能超过${CONTRACT_CONSTANTS.CAT_NFT.MAX_CAT_NAME_LENGTH}字符`
            };
        }

        return { valid: true };
    }

    /**
     * 验证域名后缀 (与合约_isValidDomainSuffix逻辑完全一致)
     */
    static validateDomainSuffix(domainSuffix: string): { valid: boolean; error?: string } {
        const { MIN_DOMAIN_LENGTH, MAX_DOMAIN_LENGTH, DOMAIN_REGEX } = CONTRACT_CONSTANTS.DOMAIN_NFT;

        if (!domainSuffix) {
            return { valid: false, error: '域名后缀不能为空' };
        }

        // 合约验证：length < MIN_DOMAIN_LENGTH || length > MAX_DOMAIN_LENGTH - 5
        if (domainSuffix.length < MIN_DOMAIN_LENGTH) {
            return {
                valid: false,
                error: `域名后缀长度不能少于${MIN_DOMAIN_LENGTH}字符`
            };
        }

        if (domainSuffix.length > MAX_DOMAIN_LENGTH) {
            return {
                valid: false,
                error: `域名后缀长度不能超过${MAX_DOMAIN_LENGTH}字符 (总长度限制30字符，advx-前缀占5字符)`
            };
        }

        // 合约验证：只允许小写字母、数字、连字符，不能以连字符开头/结尾，不能连续连字符
        if (!DOMAIN_REGEX.test(domainSuffix)) {
            return {
                valid: false,
                error: '域名格式无效：只能包含小写字母、数字和连字符，不能以连字符开始或结束，不能有连续连字符'
            };
        }

        // 检查连续连字符 (合约中的额外检查)
        if (domainSuffix.includes('--')) {
            return {
                valid: false,
                error: '域名不能包含连续的连字符'
            };
        }

        return { valid: true };
    }

    /**
     * 生成完整域名 (与合约mintDomainNFT逻辑一致)
     */
    static generateFullDomain(domainSuffix: string): string {
        const { DOMAIN_PREFIX, DOMAIN_SUFFIX } = CONTRACT_CONSTANTS.DOMAIN_NFT;
        return `${DOMAIN_PREFIX}${domainSuffix}${DOMAIN_SUFFIX}`;
    }

    /**
     * 验证NFC UID
     */
    static validateNFCUID(uid: string): { valid: boolean; error?: string } {
        const { MIN_UID_LENGTH, MAX_UID_LENGTH } = CONTRACT_CONSTANTS.NFC_REGISTRY;

        if (!uid || uid.trim().length === 0) {
            return { valid: false, error: 'NFC UID不能为空' };
        }

        if (uid.length < MIN_UID_LENGTH) {
            return {
                valid: false,
                error: `NFC UID长度不能少于${MIN_UID_LENGTH}字符`
            };
        }

        if (uid.length > MAX_UID_LENGTH) {
            return {
                valid: false,
                error: `NFC UID长度不能超过${MAX_UID_LENGTH}字符`
            };
        }

        return { valid: true };
    }

    /**
     * 验证两个NFC是否可以进行社交互动
     */
    static validateSocialInteraction(myNFC: string, otherNFC: string): { valid: boolean; error?: string } {
        // 验证两个NFC都有效
        const myNFCValidation = this.validateNFCUID(myNFC);
        if (!myNFCValidation.valid) {
            return { valid: false, error: `我的NFC无效: ${myNFCValidation.error}` };
        }

        const otherNFCValidation = this.validateNFCUID(otherNFC);
        if (!otherNFCValidation.valid) {
            return { valid: false, error: `其他NFC无效: ${otherNFCValidation.error}` };
        }

        // 验证两个NFC不能相同
        if (myNFC === otherNFC) {
            return { valid: false, error: '不能与自己进行社交互动' };
        }

        return { valid: true };
    }

    /**
     * 计算社交奖励概率
     */
    static calculateSocialBonus(interactionCount: number): number {
        const { SOCIAL_BONUS_THRESHOLD, SOCIAL_BONUS_RATE } = CONTRACT_CONSTANTS.CAT_NFT;
        const bonusLevels = Math.floor(interactionCount / SOCIAL_BONUS_THRESHOLD);
        return bonusLevels * SOCIAL_BONUS_RATE;
    }

    /**
     * 获取稀有度概率信息
     */
    static getRarityProbabilities(): {
        R: number;
        SR: number;
        SSR: number;
        UR: number;
        total: number;
    } {
        const { RARITY_PROBABILITIES } = CONTRACT_CONSTANTS.CAT_NFT;
        return {
            ...RARITY_PROBABILITIES,
            total: Object.values(RARITY_PROBABILITIES).reduce((sum, prob) => sum + prob, 0)
        };
    }

    /**
     * 格式化稀有度概率为百分比
     */
    static formatRarityProbabilities(): Record<string, string> {
        const probabilities = this.getRarityProbabilities();
        return {
            R: `${(probabilities.R / 100).toFixed(1)}%`,
            SR: `${(probabilities.SR / 100).toFixed(1)}%`,
            SSR: `${(probabilities.SSR / 100).toFixed(1)}%`,
            UR: `${(probabilities.UR / 100).toFixed(1)}%`,
        };
    }
}

// 错误消息常量
export const CONTRACT_ERROR_MESSAGES = {
    // 小猫NFT相关错误
    CAT_NFT: {
        INSUFFICIENT_FEE: `需要支付${CONTRACT_CONSTANTS.CAT_NFT.DRAW_FEE} INJ抽卡费用`,
        EMPTY_CAT_NAME: '小猫名称不能为空',
        CAT_NAME_USED: '小猫名称已被使用',
        TOO_MANY_CATS: `每个用户最多拥有${CONTRACT_CONSTANTS.CAT_NFT.MAX_CATS_PER_USER}只小猫`,
        INVALID_NFC: 'NFC UID无效',
        SAME_NFC: '不能与自己进行社交互动',
        NFC_NOT_REGISTERED: 'NFC未注册',
        ALREADY_INTERACTED: '两个NFC已经互动过，无法再次进行社交抽卡',
    },

    // 域名NFT相关错误
    DOMAIN_NFT: {
        INVALID_DOMAIN: '域名格式无效',
        DOMAIN_TAKEN: '域名已被占用',
        DOMAIN_TOO_SHORT: `域名长度不能少于${CONTRACT_CONSTANTS.DOMAIN_NFT.MIN_DOMAIN_LENGTH}字符`,
        DOMAIN_TOO_LONG: `域名长度不能超过${CONTRACT_CONSTANTS.DOMAIN_NFT.MAX_DOMAIN_LENGTH}字符`,
    },

    // NFC注册相关错误
    NFC_REGISTRY: {
        INVALID_UID: 'NFC UID格式无效',
        UID_ALREADY_BOUND: 'NFC UID已被绑定',
        UID_NOT_FOUND: 'NFC UID未找到',
        INSUFFICIENT_BALANCE: '账户余额不足',
    }
} as const;

// 导出类型定义
export type CatRarity = 'R' | 'SR' | 'SSR' | 'UR';
export type ValidationResult = { valid: boolean; error?: string };
