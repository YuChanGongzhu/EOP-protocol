// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// CatNFT合约接口
interface ICatNFT {
    function authorizeNewNFCUser(
        string memory nfcUID,
        address userWallet
    ) external;
}

// ETHDomainNFT合约接口
// Domain NFT functionality removed on Ethereum port (ENS is used instead)

/**
 * @title NFCWalletRegistry
 * @dev NFC钱包注册系统，实现账户与NFC卡片的一一对应关系
 * 提供链上透明度和审计追踪
 */
contract NFCWalletRegistry is Ownable {
    using Strings for uint256;

    // NFC钱包绑定信息
    struct NFCBinding {
        address walletAddress; // 绑定的钱包地址
        uint256 boundAt; // 绑定时间
        uint256 unboundAt; // 解绑时间 (0表示仍在绑定中)
        bool isActive; // 是否激活状态
        bool isBlank; // 是否为空白卡片（未初始化）
        string metadata; // 元数据信息
    }

    // 状态变量
    mapping(string => NFCBinding) public nfcBindings; // NFC UID -> 当前绑定信息
    mapping(string => NFCBinding[]) public nfcHistory; // NFC UID -> 历史绑定记录
    mapping(address => string) public walletToNFC; // 钱包地址 -> 绑定的NFC UID (一一对应)
    mapping(string => bool) public authorizedOperators; // 授权的操作者 (后端服务)

    // Passkey 绑定
    mapping(string => address) public passkeyToWallet; // PasskeyId -> 钱包
    mapping(address => string) public walletToPasskey; // 钱包 -> PasskeyId

    // 简易元交易 Nonce
    mapping(address => uint256) public nonces; // 钱包地址 -> 下一个可用 nonce

    uint256 public totalBindings; // 总绑定数量
    uint256 public totalUnbindings; // 总解绑数量

    // CatNFT合约地址
    ICatNFT public catNFTContract;

    // 注：已移除自定义域名NFT合约集成（以太坊上使用ENS）

    // 事件
    event NFCWalletBound(
        string indexed nfcUID,
        address indexed walletAddress,
        uint256 boundAt
    );

    event NFCWalletUnbound(
        string indexed nfcUID,
        address indexed walletAddress,
        uint256 unboundAt,
        bool cardReset
    );

    event NFCCardReset(
        string indexed nfcUID,
        address indexed previousWallet,
        uint256 resetAt
    );

    event NFCMetadataUpdated(string indexed nfcUID, string metadata);

    event OperatorAuthorized(string indexed operatorId, bool authorized);

    event BlankCardDetected(
        string indexed nfcUID,
        address indexed newWallet,
        uint256 timestamp
    );

    event CardInitialized(
        string indexed nfcUID,
        address indexed walletAddress,
        uint256 timestamp
    );

    event PasskeyBound(
        string indexed passkeyId,
        address indexed walletAddress,
        uint256 boundAt
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev 检测空白卡并自动创建账户（一一对应绑定）
     * @param nfcUID NFC卡片的唯一标识符
     * @param newWalletAddress 为该卡片新创建的钱包地址
     * @return 是否为空白卡并成功绑定
     */
    function detectAndBindBlankCard(
        string memory nfcUID,
        address newWalletAddress
    ) public onlyAuthorizedOperator returns (bool) {
        require(bytes(nfcUID).length > 0, "Invalid NFC UID");
        require(newWalletAddress != address(0), "Invalid wallet address");

        // 检查是否为空白卡（未绑定过）
        if (isNFCBound(nfcUID)) {
            return false; // 不是空白卡
        }

        // 检查钱包是否已经绑定其他NFC卡片
        if (bytes(walletToNFC[newWalletAddress]).length > 0) {
            return false; // 钱包已绑定其他NFC卡片
        }

        // 创建绑定记录，标记为空白卡初始状态
        nfcBindings[nfcUID] = NFCBinding({
            walletAddress: newWalletAddress,
            boundAt: block.timestamp,
            unboundAt: 0,
            isActive: true,
            isBlank: true, // 标记为空白卡
            metadata: "auto_created"
        });

        // 添加到历史记录
        nfcHistory[nfcUID].push(nfcBindings[nfcUID]);

        // 建立钱包到NFC的一一对应关系
        walletToNFC[newWalletAddress] = nfcUID;
        totalBindings++;

        // 自动授权用户为CatNFT合约的操作者
        if (address(catNFTContract) != address(0)) {
            try catNFTContract.authorizeNewNFCUser(nfcUID, newWalletAddress) {
                // 授权成功
            } catch {
                // 授权失败，但不影响绑定过程
            }
        }

        // 域名NFT集成已移除

        emit BlankCardDetected(nfcUID, newWalletAddress, block.timestamp);
        emit NFCWalletBound(nfcUID, newWalletAddress, block.timestamp);

        return true;
    }

    /**
     * @dev 前端自助绑定空白卡（无后端操作员）
     * @param nfcUID NFC卡片的唯一标识符
     * @return 是否为空白卡并成功绑定
     */
    function selfBindBlankCard(
        string memory nfcUID
    ) external returns (bool) {
        require(bytes(nfcUID).length > 0, "Invalid NFC UID");

        // 检查是否为空白卡（未绑定过）
        if (isNFCBound(nfcUID)) {
            return false; // 不是空白卡
        }

        // 检查钱包是否已经绑定其他NFC卡片
        if (bytes(walletToNFC[msg.sender]).length > 0) {
            return false; // 钱包已绑定其他NFC卡片
        }

        // 创建绑定记录，标记为空白卡初始状态，由用户后续初始化
        nfcBindings[nfcUID] = NFCBinding({
            walletAddress: msg.sender,
            boundAt: block.timestamp,
            unboundAt: 0,
            isActive: true,
            isBlank: true,
            metadata: "self_created"
        });

        // 添加到历史记录
        nfcHistory[nfcUID].push(nfcBindings[nfcUID]);

        // 建立钱包到NFC的一一对应关系
        walletToNFC[msg.sender] = nfcUID;
        totalBindings++;

        // 自动授权用户为CatNFT合约的操作者（若已设置）
        if (address(catNFTContract) != address(0)) {
            try catNFTContract.authorizeNewNFCUser(nfcUID, msg.sender) {
                // 授权成功
            } catch {
                // 忽略授权失败
            }
        }

        emit BlankCardDetected(nfcUID, msg.sender, block.timestamp);
        emit NFCWalletBound(nfcUID, msg.sender, block.timestamp);

        return true;
    }

    /**
     * @dev 自助绑定 Passkey 到调用者钱包
     */
    function selfBindPasskey(string memory passkeyId) external returns (bool) {
        require(bytes(passkeyId).length > 0, "Invalid passkeyId");
        require(passkeyToWallet[passkeyId] == address(0), "Passkey already bound");
        require(bytes(walletToPasskey[msg.sender]).length == 0, "Wallet already bound passkey");

        passkeyToWallet[passkeyId] = msg.sender;
        walletToPasskey[msg.sender] = passkeyId;
        emit PasskeyBound(passkeyId, msg.sender, block.timestamp);
        return true;
    }

    /**
     * @dev 代付者绑定空白卡（用户签名授权）
     */
    function sponsorBindBlankCard(
        string memory nfcUID,
        address wallet,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) external onlyAuthorizedOperator returns (bool) {
        require(block.timestamp <= deadline, "Expired");
        require(nonces[wallet] == nonce, "Invalid nonce");
        bytes32 messageHash = keccak256(abi.encodePacked(address(this), "sponsorBindBlankCard", wallet, nfcUID, nonce, deadline));
        require(_verifySignature(wallet, messageHash, signature), "Bad signature");
        nonces[wallet]++;

        // 检查是否为空白卡（未绑定过）
        if (isNFCBound(nfcUID)) {
            return false;
        }
        // 检查钱包是否已经绑定其他NFC卡片
        if (bytes(walletToNFC[wallet]).length > 0) {
            return false;
        }

        nfcBindings[nfcUID] = NFCBinding({
            walletAddress: wallet,
            boundAt: block.timestamp,
            unboundAt: 0,
            isActive: true,
            isBlank: true,
            metadata: "sponsor_created"
        });
        nfcHistory[nfcUID].push(nfcBindings[nfcUID]);
        walletToNFC[wallet] = nfcUID;
        totalBindings++;

        if (address(catNFTContract) != address(0)) {
            try catNFTContract.authorizeNewNFCUser(nfcUID, wallet) {} catch {}
        }

        emit BlankCardDetected(nfcUID, wallet, block.timestamp);
        emit NFCWalletBound(nfcUID, wallet, block.timestamp);
        return true;
    }

    /**
     * @dev 代付者绑定 Passkey 到指定钱包（用户签名授权）
     */
    function bindPasskeyWithSig(
        string memory passkeyId,
        address wallet,
        uint256 deadline,
        uint256 nonce,
        bytes memory signature
    ) external onlyAuthorizedOperator returns (bool) {
        require(bytes(passkeyId).length > 0, "Invalid passkeyId");
        require(block.timestamp <= deadline, "Expired");
        require(nonces[wallet] == nonce, "Invalid nonce");
        require(passkeyToWallet[passkeyId] == address(0), "Passkey already bound");
        require(bytes(walletToPasskey[wallet]).length == 0, "Wallet already bound passkey");

        bytes32 messageHash = keccak256(abi.encodePacked(address(this), "bindPasskey", wallet, passkeyId, nonce, deadline));
        require(_verifySignature(wallet, messageHash, signature), "Bad signature");
        nonces[wallet]++;

        passkeyToWallet[passkeyId] = wallet;
        walletToPasskey[wallet] = passkeyId;
        emit PasskeyBound(passkeyId, wallet, block.timestamp);
        return true;
    }

    /**
     * @dev 初始化空白卡（用户首次操作时）
     * @param nfcUID NFC卡片的唯一标识符
     * @param initMetadata 初始化元数据
     */
    function initializeBlankCard(
        string memory nfcUID,
        string memory initMetadata
    ) external onlyAuthorizedOperator {
        require(isNFCBound(nfcUID), "NFC not bound");

        NFCBinding storage binding = nfcBindings[nfcUID];
        require(binding.isBlank, "Card is not blank");
        require(binding.isActive, "Card is not active");

        // 将卡片标记为已初始化
        binding.isBlank = false;
        binding.metadata = initMetadata;

        emit CardInitialized(nfcUID, binding.walletAddress, block.timestamp);
    }

    /**
     * @dev 批量检测多张空白卡
     * @param nfcUIDs NFC UID数组
     * @param walletAddresses 对应的新钱包地址数组
     * @return 成功绑定的空白卡数量
     */
    function batchDetectBlankCards(
        string[] memory nfcUIDs,
        address[] memory walletAddresses
    ) external onlyAuthorizedOperator returns (uint256) {
        require(
            nfcUIDs.length == walletAddresses.length,
            "Array length mismatch"
        );

        uint256 successCount = 0;

        for (uint256 i = 0; i < nfcUIDs.length; i++) {
            if (detectAndBindBlankCard(nfcUIDs[i], walletAddresses[i])) {
                successCount++;
            }
        }

        return successCount;
    }

    /**
     * @dev 解绑NFC UID (仅限钱包所有者使用签名验证)
     * @param nfcUID NFC卡片的唯一标识符
     * @param ownerSignature 钱包所有者的签名
     */
    function unbindNFCWallet(
        string memory nfcUID,
        bytes memory ownerSignature
    ) external {
        require(isNFCBound(nfcUID), "NFC not bound");

        NFCBinding storage binding = nfcBindings[nfcUID];
        address walletAddress = binding.walletAddress;

        // 验证签名（确保是私钥所有者授权）
        require(
            _verifyOwnerSignature(
                walletAddress,
                nfcUID,
                "unbind",
                ownerSignature
            ),
            "Invalid signature"
        );

        // 清除钱包到NFC的映射关系
        delete walletToNFC[walletAddress];

        // 更新绑定记录状态而不是删除
        binding.isActive = false;
        binding.unboundAt = block.timestamp;

        totalBindings--;
        totalUnbindings++;

        emit NFCWalletUnbound(nfcUID, walletAddress, block.timestamp, false);
    }

    /**
     * @dev 授权操作者解绑（仅限紧急情况）
     * @param nfcUID NFC卡片的唯一标识符
     */
    function emergencyUnbindNFCWallet(
        string memory nfcUID
    ) external onlyAuthorizedOperator {
        require(isNFCBound(nfcUID), "NFC not bound");

        NFCBinding storage binding = nfcBindings[nfcUID];
        address walletAddress = binding.walletAddress;

        // 清除钱包到NFC的映射关系
        delete walletToNFC[walletAddress];

        // 更新绑定记录状态而不是删除
        binding.isActive = false;
        binding.unboundAt = block.timestamp;

        totalBindings--;
        totalUnbindings++;

        emit NFCWalletUnbound(nfcUID, walletAddress, block.timestamp, true);
    }

    /**
     * @dev 更新NFC元数据
     * @param nfcUID NFC卡片UID
     * @param metadata 新的元数据
     */
    function updateNFCMetadata(
        string memory nfcUID,
        string memory metadata
    ) external onlyAuthorizedOperator {
        require(isNFCBound(nfcUID), "NFC not bound");

        nfcBindings[nfcUID].metadata = metadata;
        emit NFCMetadataUpdated(nfcUID, metadata);
    }

    /**
     * @dev 检查NFC是否为空白卡
     * @param nfcUID NFC卡片UID
     * @return 是否为空白卡
     */
    function isBlankCard(string memory nfcUID) external view returns (bool) {
        if (!isNFCBound(nfcUID)) {
            return true; // 未绑定的卡都视为空白卡
        }
        return nfcBindings[nfcUID].isBlank;
    }

    /**
     * @dev 获取钱包绑定的NFC卡片（一一对应关系）
     * @param walletAddress 钱包地址
     * @return 绑定的NFC UID，如果未绑定则返回空字符串
     */
    function getWalletNFC(
        address walletAddress
    ) external view returns (string memory) {
        return walletToNFC[walletAddress];
    }

    /**
     * @dev 检查钱包是否已绑定NFC卡片
     * @param walletAddress 钱包地址
     * @return 是否已绑定
     */
    function isWalletBound(address walletAddress) external view returns (bool) {
        return bytes(walletToNFC[walletAddress]).length > 0;
    }

    /**
     * @dev 检查NFC是否已绑定
     * @param nfcUID NFC卡片UID
     * @return 是否已绑定
     */
    function isNFCBound(string memory nfcUID) public view returns (bool) {
        return nfcBindings[nfcUID].isActive;
    }

    /**
     * @dev 获取钱包的下一个 nonce
     */
    function getNonce(address wallet) external view returns (uint256) {
        return nonces[wallet];
    }

    /**
     * @dev 获取NFC绑定信息
     * @param nfcUID NFC卡片UID
     * @return 绑定信息结构
     */
    function getNFCBinding(
        string memory nfcUID
    ) external view returns (NFCBinding memory) {
        require(isNFCBound(nfcUID), "NFC not bound");
        return nfcBindings[nfcUID];
    }

    /**
     * @dev 获取NFC历史绑定记录
     * @param nfcUID NFC卡片UID
     * @return 历史绑定记录数组
     */
    function getNFCHistory(
        string memory nfcUID
    ) external view returns (NFCBinding[] memory) {
        return nfcHistory[nfcUID];
    }

    /**
     * @dev 设置CatNFT合约地址
     * @param _catNFTContract CatNFT合约地址
     */
    function setCatNFTContract(address _catNFTContract) external onlyOwner {
        require(_catNFTContract != address(0), "Invalid contract address");
        catNFTContract = ICatNFT(_catNFTContract);
    }

    // setDomainNFTContract 已移除（域名服务删除）

    // 管理员函数

    /**
     * @dev 授权操作者
     * @param operatorId 操作者ID
     * @param authorized 是否授权
     */
    function authorizeOperator(
        string memory operatorId,
        bool authorized
    ) external onlyOwner {
        authorizedOperators[operatorId] = authorized;
        emit OperatorAuthorized(operatorId, authorized);
    }

    /**
     * @dev 检查是否为授权操作者
     * @param operatorId 操作者ID
     * @return 是否授权
     */
    function isAuthorizedOperator(
        string memory operatorId
    ) public view returns (bool) {
        return authorizedOperators[operatorId];
    }

    /**
     * @dev 验证钱包所有者签名
     * @param walletAddress 钱包地址
     * @param nfcUID NFC UID
     * @param action 操作类型
     * @param signature 签名
     * @return 签名是否有效
     */
    function _verifyOwnerSignature(
        address walletAddress,
        string memory nfcUID,
        string memory action,
        bytes memory signature
    ) internal pure returns (bool) {
        // 构建签名消息
        bytes32 messageHash = keccak256(
            abi.encodePacked(walletAddress, nfcUID, action)
        );
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // 从签名中恢复签名者地址
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);
        address signer = ecrecover(ethSignedMessageHash, v, r, s);

        return signer == walletAddress;
    }

    /**
     * @dev 分割签名
     * @param signature 签名
     * @return r 签名组件 r
     * @return s 签名组件 s
     * @return v 签名组件 v
     */
    function _splitSignature(
        bytes memory signature
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(signature.length == 65, "Invalid signature length");

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
    }

    function _verifySignature(
        address wallet,
        bytes32 messageHash,
        bytes memory signature
    ) internal pure returns (bool) {
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);
        address signer = ecrecover(ethSignedMessageHash, v, r, s);
        return signer == wallet;
    }

    /**
     * @dev 修饰符：仅授权操作者
     */
    modifier onlyAuthorizedOperator() {
        require(
            authorizedOperators[addressToString(msg.sender)] ||
                msg.sender == owner(),
            "Not authorized operator"
        );
        _;
    }

    /**
     * @dev 将地址转换为字符串
     */
    function addressToString(
        address addr
    ) internal pure returns (string memory) {
        return Strings.toHexString(uint160(addr), 20);
    }
}
