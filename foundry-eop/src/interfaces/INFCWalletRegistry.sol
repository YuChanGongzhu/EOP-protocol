// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title INFCWalletRegistry Interface
 * @dev NFCWalletRegistry合约接口定义
 */
interface INFCWalletRegistry {
    // NFC钱包绑定信息结构
    struct NFCBinding {
        address walletAddress; // 绑定的钱包地址
        uint256 boundAt; // 绑定时间
        uint256 unboundAt; // 解绑时间 (0表示仍在绑定中)
        bool isActive; // 是否激活状态
        bool isBlank; // 是否为空白卡片（未初始化）
        string metadata; // 元数据信息
    }

    function isNFCBound(string memory nfcUID) external view returns (bool);
    function getNFCBinding(
        string memory nfcUID
    ) external view returns (NFCBinding memory);
}
