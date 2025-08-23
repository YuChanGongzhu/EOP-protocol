// 智能合约地址配置
// 部署时间: 2025年7月30日
// 网络: Injective EVM 测试网

export const CONTRACT_ADDRESSES = {
    // NFC钱包注册合约
    NFC_WALLET_REGISTRY: '0x27f4eBf92371d2dcDd9C0D6d17847688aA4d840B',

    // Injective域名NFT合约
    INJ_DOMAIN_NFT: '0x598AAe7ab70e3afe0669b17Ba856993F3080C4a7',

    // 社交抽卡Cat NFT合约
    CAT_NFT: '0x80983862cb4A43Cdfc4bEe9558f0c285130Df0F5',
} as const;

// 合约部署信息
export const DEPLOYMENT_INFO = {
    DEPLOYER: '0x1dd50ffF32Ecde6694e56C5bBfE902Fcbc8d2441',
    NETWORK: 'Injective EVM Testnet',
    RPC_URL: 'https://evmrpc-testnet.injective.network',
    CHAIN_ID: 1455,
    DEPLOYED_AT: '2025-08-03',

    TRANSACTIONS: {
        NFC_WALLET_REGISTRY: '0x6c5184e154f9e64a3bfa4198b1d554f8d068eeffe020e744ec419291499c5cab',
        INJ_DOMAIN_NFT: '0x5a1fd04583b6cf7b6e79082903de1cb1de5b8b41266bcc8ef30ae0603d19cdb2',
        CAT_NFT: '0x00722a9846d392c4dba302b1a06666567fc645d54ab8e3cf2c583742e1f5b093',
    }
} as const;

// 类型定义
export type ContractName = keyof typeof CONTRACT_ADDRESSES;
export type TransactionHash = keyof typeof DEPLOYMENT_INFO.TRANSACTIONS;
