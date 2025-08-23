// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/INFCWalletRegistry.sol";

/**
 * @title INJDomainNFT
 * @dev .inj域名NFT系统智能合约
 * 将域名作为NFT进行铸造、转移和管理
 * 增强版权限控制，与NFCWalletRegistry集成
 */
contract INJDomainNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // 域名信息结构
    struct DomainInfo {
        string domainName; // 完整域名 (例如: alice.inj)
        address owner; // 域名所有者
        string nfcUID; // 绑定的NFC UID
        uint256 registeredAt; // 注册时间
        bool isActive; // 是否激活状态
        string metadata; // 元数据 (可存储头像、描述等)
    }

    // 状态变量
    uint256 private _tokenIds;
    mapping(uint256 => DomainInfo) public domainInfos; // tokenId -> 域名信息
    mapping(string => uint256) public domainToTokenId; // 域名 -> tokenId
    mapping(string => uint256) public nfcToTokenId; // NFC UID -> tokenId
    mapping(address => uint256[]) public userTokenIds; // 地址 -> 拥有的tokenId数组
    mapping(address => uint256) public primaryDomainTokenId; // 地址 -> 主域名tokenId

    uint256 public registrationFee = 0; // 注册费用 (免费注册)
    uint256 public constant MIN_DOMAIN_LENGTH = 1; // 最小域名长度
    uint256 public constant MAX_DOMAIN_LENGTH = 30; // 最大域名长度

    // NFC注册表合约地址
    INFCWalletRegistry public nfcRegistry;

    // 授权操作者映射
    mapping(address => bool) public authorizedOperators;

    // 事件
    event DomainNFTMinted(
        uint256 indexed tokenId,
        string indexed domain,
        address indexed owner,
        uint256 registeredAt
    );

    event DomainNFTTransferred(
        uint256 indexed tokenId,
        string indexed domain,
        address indexed from,
        address to
    );

    event PrimaryDomainSet(
        address indexed user,
        uint256 indexed tokenId,
        string indexed domain
    );

    event DomainMetadataUpdated(
        uint256 indexed tokenId,
        string indexed domain,
        string metadata
    );

    event NFCRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    event OperatorAuthorized(address indexed operator, bool authorized);

    constructor(
        address _nfcRegistry
    ) ERC721("INJ Domain NFT", "INJDN") Ownable(msg.sender) {
        require(_nfcRegistry != address(0), "Invalid NFC registry address");
        nfcRegistry = INFCWalletRegistry(_nfcRegistry);

        // 授权部署者为操作者
        authorizedOperators[msg.sender] = true;
    }

    /**
     * @dev 铸造域名NFT (与NFC绑定，自动添加advx-前缀)
     * @param domainSuffix 域名后缀 (会自动添加advx-前缀)
     * @param nfcUID 绑定的NFC UID
     * @param metadataURI NFT元数据URI
     */
    function mintDomainNFT(
        string memory domainSuffix,
        string memory nfcUID,
        string memory metadataURI
    ) external payable nonReentrant onlyAuthorizedOperator {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(_isValidDomainSuffix(domainSuffix), "Invalid domain suffix");
        require(bytes(nfcUID).length > 0, "Invalid NFC UID");
        require(!_nfcBound(nfcUID), "NFC already bound to domain");

        // 验证NFC在注册表中
        require(nfcRegistry.isNFCBound(nfcUID), "NFC not registered");

        // 验证调用者拥有该NFC
        INFCWalletRegistry.NFCBinding memory binding = nfcRegistry
            .getNFCBinding(nfcUID);
        require(msg.sender == binding.walletAddress, "You don't own this NFC");

        // 自动添加 advx- 前缀
        string memory domainPrefix = string(
            abi.encodePacked("advx-", domainSuffix)
        );
        string memory fullDomain = string(
            abi.encodePacked(domainPrefix, ".inj")
        );
        require(!_domainExists(fullDomain), "Domain already registered");

        // 生成新的tokenId
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        // 记录域名信息
        domainInfos[newTokenId] = DomainInfo({
            domainName: fullDomain,
            owner: msg.sender,
            nfcUID: nfcUID,
            registeredAt: block.timestamp,
            isActive: true,
            metadata: ""
        });

        // 更新映射关系
        domainToTokenId[fullDomain] = newTokenId;
        nfcToTokenId[nfcUID] = newTokenId;
        userTokenIds[msg.sender].push(newTokenId);

        // 如果用户没有主域名，设置为主域名
        if (primaryDomainTokenId[msg.sender] == 0) {
            primaryDomainTokenId[msg.sender] = newTokenId;
        }

        // 铸造NFT
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataURI);

        emit DomainNFTMinted(
            newTokenId,
            fullDomain,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev 解绑并转移域名NFT所有权 (参考NFCCardNFT的转让逻辑)
     * @param nfcUID NFC卡片UID
     * @param newOwner 新的所有者地址
     */
    function unbindAndTransferDomain(
        string memory nfcUID,
        address newOwner
    ) external nonReentrant onlyAuthorizedOperator {
        require(newOwner != address(0), "Invalid new owner address");

        uint256 tokenId = nfcToTokenId[nfcUID];
        require(tokenId != 0, "NFC not found");
        require(_ownerOf(tokenId) != address(0), "Domain NFT does not exist");

        DomainInfo storage domain = domainInfos[tokenId];
        address domainOwner = ownerOf(tokenId);

        // 验证调用者必须是域名所有者
        require(msg.sender == domainOwner, "Only domain owner can transfer");

        // 清除NFC映射关系（解绑）
        delete nfcToTokenId[nfcUID];

        // 更新域名状态
        domain.nfcUID = "";
        domain.isActive = false;

        // 转移NFT所有权
        _transfer(domainOwner, newOwner, tokenId);

        // 更新域名所有者
        domain.owner = newOwner;

        // 从原所有者的tokenId列表中移除
        _removeTokenIdFromUser(domainOwner, tokenId);

        // 添加到新所有者的tokenId列表
        userTokenIds[newOwner].push(tokenId);

        // 如果转移的是主域名，清除原所有者的主域名
        if (primaryDomainTokenId[domainOwner] == tokenId) {
            primaryDomainTokenId[domainOwner] = 0;
        }

        // 如果新所有者没有主域名，设置为主域名
        if (primaryDomainTokenId[newOwner] == 0) {
            primaryDomainTokenId[newOwner] = tokenId;
        }

        emit DomainNFTTransferred(
            tokenId,
            domain.domainName,
            domainOwner,
            newOwner
        );
    }

    /**
     * @dev 设置主域名
     * @param tokenId 要设置为主域名的NFT代币ID
     */
    function setPrimaryDomain(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(!_isDomainExpired(tokenId), "Domain expired");

        primaryDomainTokenId[msg.sender] = tokenId;
        emit PrimaryDomainSet(
            msg.sender,
            tokenId,
            domainInfos[tokenId].domainName
        );
    }

    /**
     * @dev 更新域名元数据
     * @param tokenId NFT代币ID
     * @param metadata 元数据
     */
    function updateDomainMetadata(
        uint256 tokenId,
        string memory metadata
    ) external {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(!_isDomainExpired(tokenId), "Domain expired");

        domainInfos[tokenId].metadata = metadata;
        emit DomainMetadataUpdated(
            tokenId,
            domainInfos[tokenId].domainName,
            metadata
        );
    }

    /**
     * @dev 检查域名是否可用（会自动添加advx-前缀）
     * @param domainSuffix 域名后缀
     * @return 是否可用
     */
    function isDomainAvailable(
        string memory domainSuffix
    ) external view returns (bool) {
        if (!_isValidDomainSuffix(domainSuffix)) {
            return false;
        }

        // 自动添加 advx- 前缀
        string memory domainPrefix = string(
            abi.encodePacked("advx-", domainSuffix)
        );
        string memory fullDomain = string(
            abi.encodePacked(domainPrefix, ".inj")
        );
        return
            !_domainExists(fullDomain) || _isDomainExpiredByDomain(fullDomain);
    }

    /**
     * @dev 解析域名到地址
     * @param domain 完整域名
     * @return 对应的地址
     */
    function resolveDomain(
        string memory domain
    ) external view returns (address) {
        if (!_domainExists(domain) || _isDomainExpiredByDomain(domain)) {
            return address(0);
        }
        uint256 tokenId = domainToTokenId[domain];
        return domainInfos[tokenId].owner;
    }

    /**
     * @dev 反向解析地址到主域名
     * @param addr 地址
     * @return 主域名
     */
    function reverseResolve(
        address addr
    ) external view returns (string memory) {
        uint256 primaryTokenId = primaryDomainTokenId[addr];
        if (primaryTokenId == 0 || _isDomainExpired(primaryTokenId)) {
            return "";
        }
        return domainInfos[primaryTokenId].domainName;
    }

    /**
     * @dev 获取用户的所有域名tokenId
     * @param user 用户地址
     * @return tokenId数组
     */
    function getUserTokenIds(
        address user
    ) external view returns (uint256[] memory) {
        return userTokenIds[user];
    }

    /**
     * @dev 获取域名详细信息
     * @param tokenId NFT代币ID
     * @return 域名信息结构
     */
    function getDomainInfo(
        uint256 tokenId
    ) external view returns (DomainInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return domainInfos[tokenId];
    }

    /**
     * @dev 根据域名获取tokenId
     * @param domain 完整域名
     * @return tokenId
     */
    function getTokenIdByDomain(
        string memory domain
    ) external view returns (uint256) {
        require(_domainExists(domain), "Domain does not exist");
        return domainToTokenId[domain];
    }

    // 内部函数

    /**
     * @dev 验证域名后缀格式（会自动添加advx-前缀）
     */
    function _isValidDomainSuffix(
        string memory domainSuffix
    ) internal pure returns (bool) {
        bytes memory domainBytes = bytes(domainSuffix);
        uint256 length = domainBytes.length;

        // 检查长度（考虑到会添加 "advx-" 前缀，所以后缀长度要求相应调整）
        // advx- = 5个字符，所以总长度范围是 5 + suffix_length
        // 设置后缀最小长度为 1，以确保总长度符合域名规范
        if (length < MIN_DOMAIN_LENGTH || length > MAX_DOMAIN_LENGTH - 5) {
            return false;
        }

        // 检查字符：只允许小写字母、数字、连字符
        // 不能以连字符开头或结尾，不能有连续连字符
        for (uint256 i = 0; i < length; i++) {
            bytes1 char = domainBytes[i];

            // 检查是否为有效字符
            if (
                !((char >= 0x61 && char <= 0x7A) || // a-z
                    (char >= 0x30 && char <= 0x39) || // 0-9
                    char == 0x2D)
            ) {
                // -
                return false;
            }

            // 不能以连字符开头或结尾
            if ((i == 0 || i == length - 1) && char == 0x2D) {
                return false;
            }

            // 不能有连续连字符
            if (i > 0 && char == 0x2D && domainBytes[i - 1] == 0x2D) {
                return false;
            }
        }

        return true;
    }

    /**
     * @dev 检查域名是否存在
     */
    function _domainExists(string memory domain) internal view returns (bool) {
        return domainToTokenId[domain] != 0;
    }

    /**
     * @dev 检查NFC是否已绑定到域名
     */
    function _nfcBound(string memory nfcUID) internal view returns (bool) {
        return nfcToTokenId[nfcUID] != 0;
    }

    /**
     * @dev 检查域名是否过期（通过tokenId）
     */
    function _isDomainExpired(uint256 tokenId) internal view returns (bool) {
        // 简化实现：假设域名不会过期
        // 在实际应用中，这里应该检查注册时间 + 有效期
        return false;
    }

    /**
     * @dev 检查域名是否过期（通过域名）
     */
    function _isDomainExpiredByDomain(
        string memory domain
    ) internal view returns (bool) {
        uint256 tokenId = domainToTokenId[domain];
        if (tokenId == 0) return true; // 域名不存在，视为过期
        return _isDomainExpired(tokenId);
    }

    /**
     * @dev 根据NFC UID获取域名tokenId
     */
    function getTokenIdByNFC(
        string memory nfcUID
    ) external view returns (uint256) {
        require(_nfcBound(nfcUID), "NFC not bound to domain");
        return nfcToTokenId[nfcUID];
    }

    /**
     * @dev 从用户tokenId列表中移除tokenId
     */
    function _removeTokenIdFromUser(address user, uint256 tokenId) internal {
        uint256[] storage userTokenIdList = userTokenIds[user];
        for (uint256 i = 0; i < userTokenIdList.length; i++) {
            if (userTokenIdList[i] == tokenId) {
                userTokenIdList[i] = userTokenIdList[
                    userTokenIdList.length - 1
                ];
                userTokenIdList.pop();
                break;
            }
        }
    }

    // ERC721 重写函数

    /**
     * @dev 重写 _update 函数以处理转移逻辑
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        // 调用父类的 _update
        address result = super._update(to, tokenId, auth);

        // 如果是转移操作，更新域名所有者
        if (from != address(0) && to != address(0) && from != to) {
            domainInfos[tokenId].owner = to;
        }

        return result;
    }

    /**
     * @dev 重写 _ownerOf 函数
     */
    function _ownerOf(
        uint256 tokenId
    ) internal view virtual override(ERC721) returns (address) {
        return super._ownerOf(tokenId);
    }

    /**
     * @dev 重写 tokenURI 函数
     */
    function tokenURI(
        uint256 tokenId
    )
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev 重写 supportsInterface 函数
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // 管理员函数

    /**
     * @dev 自动授权新注册的NFC用户（由NFCRegistry调用）
     * @param nfcUID NFC UID
     * @param userWallet 用户钱包地址
     */
    function authorizeNewNFCUser(
        string memory nfcUID,
        address userWallet
    ) external {
        require(
            msg.sender == address(nfcRegistry),
            "Only NFC registry can call"
        );
        require(userWallet != address(0), "Invalid wallet address");
        require(bytes(nfcUID).length > 0, "Invalid NFC UID");

        // 验证NFC确实已绑定
        require(nfcRegistry.isNFCBound(nfcUID), "NFC not bound");

        // 自动授权用户为操作者
        authorizedOperators[userWallet] = true;

        emit OperatorAuthorized(userWallet, true);
    }

    /**
     * @dev 更新NFC注册表地址
     */
    function setNFCRegistry(address _nfcRegistry) external onlyOwner {
        require(_nfcRegistry != address(0), "Invalid address");
        address oldRegistry = address(nfcRegistry);
        nfcRegistry = INFCWalletRegistry(_nfcRegistry);
        emit NFCRegistryUpdated(oldRegistry, _nfcRegistry);
    }

    /**
     * @dev 授权操作者
     */
    function setAuthorizedOperator(
        address operator,
        bool authorized
    ) external onlyOwner {
        authorizedOperators[operator] = authorized;
        emit OperatorAuthorized(operator, authorized);
    }

    /**
     * @dev 批量授权操作者
     */
    function batchSetAuthorizedOperators(
        address[] memory operators,
        bool[] memory authorizations
    ) external onlyOwner {
        require(
            operators.length == authorizations.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < operators.length; i++) {
            authorizedOperators[operators[i]] = authorizations[i];
            emit OperatorAuthorized(operators[i], authorizations[i]);
        }
    }

    /**
     * @dev 设置注册费用
     */
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
    }

    /**
     * @dev 提取合约余额
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev 紧急冻结域名 (仅管理员)
     */
    function emergencyFreezeDomain(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        domainInfos[tokenId].isActive = false;
    }

    /**
     * @dev 解冻域名 (仅管理员)
     */
    function unfreezeDomain(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        domainInfos[tokenId].isActive = true;
    }

    // 修饰符

    /**
     * @dev 仅授权操作者可调用
     */
    modifier onlyAuthorizedOperator() {
        require(
            authorizedOperators[msg.sender] || msg.sender == owner(),
            "Not authorized operator"
        );
        _;
    }
}
