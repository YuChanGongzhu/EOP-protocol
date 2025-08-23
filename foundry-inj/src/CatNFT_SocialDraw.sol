// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/INFCWalletRegistry.sol";

/**
 * @title CatNFT
 * @dev
 * 支持R、SR、SSR、UR稀有度小猫NFT系统智能合约，彩虹猫作为UR且具有唯一性
 * 新增社交抽卡机制：需要贴其他用户的NFC卡片才能抽卡
 */
contract CatNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // 小猫信息结构（简化版）
    struct CatInfo {
        string name; // 小猫名称
        CatRarity rarity; // 稀有度
        string color; // 小猫颜色
        uint256 mintedAt; // 铸造时间
        string metadata; // 元数据
    }

    // 稀有度枚举
    enum CatRarity {
        R, // 普通 (黑猫)
        SR, // 稀有 (绿猫、红猫、橘猫)
        SSR, // 超稀有 (紫猫、蓝猫)
        UR // 超超稀有 (彩虹猫)
    }

    // 状态变量
    uint256 private _tokenIds;
    mapping(uint256 => CatInfo) public catInfos; // tokenId -> 小猫信息
    mapping(address => uint256[]) public userCats; // 地址 -> 拥有的小猫tokenId数组
    mapping(CatRarity => uint256) public rarityCounts; // 各稀有度数量统计
    mapping(string => bool) public usedColors; // 已使用的颜色

    // 社交互动相关映射
    mapping(string => mapping(string => bool)) public socialInteractions; // myNFC -> otherNFC -> 是否已互动过
    mapping(string => uint256) public drawCounts; // NFC UID -> 可用抽卡次数
    mapping(string => string[]) public interactedNFCs; // NFC UID -> 已互动过的NFC列表
    mapping(string => uint256) public totalDrawsUsed; // NFC UID -> 已使用的抽卡次数

    uint256 public drawFee = 0.1 ether; // 抽卡费用 (0.1 INJ)
    uint256 public socialInteractionReward = 1; // 每次社交互动获得的抽卡次数
    uint256 public constant MAX_CATS_PER_USER = 100; // 每个用户最多拥有的小猫数量

    // NFC注册表合约地址
    INFCWalletRegistry public nfcRegistry;

    // 授权操作者映射
    mapping(address => bool) public authorizedOperators;

    // 稀有度概率 (基点: 10000 = 100%)
    uint256 public constant R_PROBABILITY = 6000; // 60% (黑猫)
    uint256 public constant SR_PROBABILITY = 3000; // 30% (绿猫、红猫、橘猫)
    uint256 public constant SSR_PROBABILITY = 900; // 9% (紫猫、蓝猫)
    uint256 public constant UR_PROBABILITY = 100; // 1% (彩虹猫)

    // 彩虹猫相关
    bool public rainbowCatMinted = false; // 彩虹猫是否已被铸造
    uint256 public rainbowCatTokenId; // 彩虹猫的tokenId

    // 事件
    event CatNFTMinted(
        uint256 indexed tokenId,
        string indexed name,
        CatRarity rarity,
        string color,
        address indexed owner,
        uint256 mintedAt
    );

    event SocialInteractionCompleted(
        string indexed myNFC,
        string indexed otherNFC,
        uint256 rewardedDraws,
        uint256 totalDrawsAvailable
    );

    event CatDrawnWithTickets(
        uint256 indexed tokenId,
        string indexed catName,
        CatRarity rarity,
        string color,
        address indexed owner,
        string nfcUID,
        uint256 remainingTickets
    );

    event RainbowCatFound(
        uint256 indexed tokenId,
        string indexed name,
        address indexed finder,
        uint256 mintedAt
    );

    event CatNFTTransferred(
        uint256 indexed tokenId,
        string indexed name,
        address indexed from,
        address to
    );

    event NFCRegistryUpdated(
        address indexed oldRegistry,
        address indexed newRegistry
    );

    event OperatorAuthorized(address indexed operator, bool authorized);

    constructor(
        address _nfcRegistry
    ) ERC721("Cat NFT", "CAT") Ownable(msg.sender) {
        require(_nfcRegistry != address(0), "Invalid NFC registry address");
        nfcRegistry = INFCWalletRegistry(_nfcRegistry);

        // 授权部署者为操作者
        authorizedOperators[msg.sender] = true;
    }

    /**
     * @dev 社交互动获取抽卡次数（需要贴其他用户的NFC卡片）
     * @param myNFC 自己的NFC UID
     * @param otherNFC 其他用户的NFC UID
     */
    function socialInteraction(
        string memory myNFC,
        string memory otherNFC
    ) external nonReentrant onlyAuthorizedOperator {
        require(bytes(myNFC).length > 0, "Invalid my NFC UID");
        require(bytes(otherNFC).length > 0, "Invalid other NFC UID");
        require(
            keccak256(bytes(myNFC)) != keccak256(bytes(otherNFC)),
            "Cannot interact with yourself"
        );

        // 验证两个NFC都在注册表中
        require(nfcRegistry.isNFCBound(myNFC), "My NFC not registered");
        require(nfcRegistry.isNFCBound(otherNFC), "Other NFC not registered");

        // 验证调用者拥有myNFC
        INFCWalletRegistry.NFCBinding memory myBinding = nfcRegistry
            .getNFCBinding(myNFC);
        require(
            msg.sender == myBinding.walletAddress,
            "You don't own this NFC"
        );

        // 检查是否已经互动过（防止刷抽卡次数）
        require(
            !socialInteractions[myNFC][otherNFC],
            "Already interacted with this NFC"
        );

        // 记录社交互动
        socialInteractions[myNFC][otherNFC] = true;
        socialInteractions[otherNFC][myNFC] = true; // 双向记录
        interactedNFCs[myNFC].push(otherNFC);
        interactedNFCs[otherNFC].push(myNFC);

        // 增加抽卡次数
        drawCounts[myNFC] += socialInteractionReward;
        drawCounts[otherNFC] += socialInteractionReward; // 双方都获得奖励

        emit SocialInteractionCompleted(
            myNFC,
            otherNFC,
            socialInteractionReward,
            drawCounts[myNFC]
        );

        emit SocialInteractionCompleted(
            otherNFC,
            myNFC,
            socialInteractionReward,
            drawCounts[otherNFC]
        );
    }

    /**
     * @dev 使用抽卡次数获得小猫NFT
     * @param nfcUID NFC UID
     * @param catName 小猫名称
     */
    function drawCatNFTWithTickets(
        string memory nfcUID,
        string memory catName
    ) external payable nonReentrant {
        require(msg.value >= drawFee, "Insufficient draw fee");
        require(bytes(catName).length > 0, "Cat name cannot be empty");
        require(bytes(nfcUID).length > 0, "Invalid NFC UID");
        require(drawCounts[nfcUID] > 0, "No draw tickets available");

        // 验证NFC在注册表中
        require(nfcRegistry.isNFCBound(nfcUID), "NFC not registered");

        // 获取NFC对应的钱包地址并验证调用者拥有该NFC
        INFCWalletRegistry.NFCBinding memory binding = nfcRegistry
            .getNFCBinding(nfcUID);
        require(msg.sender == binding.walletAddress, "You don't own this NFC");
        require(
            userCats[binding.walletAddress].length < MAX_CATS_PER_USER,
            "Too many cats"
        );

        // 消耗一次抽卡次数
        drawCounts[nfcUID]--;
        totalDrawsUsed[nfcUID]++;

        // 生成新的tokenId
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        // 生成随机稀有度（基于社交互动增加概率）
        CatRarity rarity = _generateSocialRarity(nfcUID);

        // 根据稀有度生成颜色
        string memory color = _generateColor(rarity);

        // 创建小猫信息
        CatInfo memory newCat = CatInfo({
            name: catName,
            rarity: rarity,
            color: color,
            mintedAt: block.timestamp,
            metadata: string(abi.encodePacked("drawn_with_tickets:", nfcUID))
        });

        // 存储小猫信息
        catInfos[newTokenId] = newCat;
        usedColors[color] = true;
        rarityCounts[rarity]++;

        // 如果是彩虹猫，记录特殊信息
        if (rarity == CatRarity.UR) {
            rainbowCatMinted = true;
            rainbowCatTokenId = newTokenId;
            emit RainbowCatFound(
                newTokenId,
                catName,
                binding.walletAddress,
                block.timestamp
            );
        }

        // 添加到用户的小猫列表
        userCats[binding.walletAddress].push(newTokenId);

        // 铸造NFT到用户钱包
        _safeMint(binding.walletAddress, newTokenId);

        emit CatDrawnWithTickets(
            newTokenId,
            catName,
            rarity,
            color,
            binding.walletAddress,
            nfcUID,
            drawCounts[nfcUID]
        );

        emit CatNFTMinted(
            newTokenId,
            catName,
            rarity,
            color,
            binding.walletAddress,
            block.timestamp
        );
    }

    // /**
    //  * @dev 传统抽卡方法（保留用于测试，实际使用社交抽卡）
    //  * @param catName 小猫名称
    //  */
    // function drawCatNFT(string memory catName) external payable nonReentrant {
    //     require(msg.value >= drawFee, "Insufficient draw fee");
    //     require(bytes(catName).length > 0, "Cat name cannot be empty");
    //     require(
    //         userCats[msg.sender].length < MAX_CATS_PER_USER,
    //         "Too many cats"
    //     );

    //     // 生成新的tokenId
    //     _tokenIds++;
    //     uint256 newTokenId = _tokenIds;

    //     // 生成随机稀有度
    //     CatRarity rarity = _generateRarity();

    //     // 根据稀有度生成颜色
    //     string memory color = _generateColor(rarity);

    //     // 创建小猫信息
    //     CatInfo memory newCat = CatInfo({
    //         name: catName,
    //         rarity: rarity,
    //         color: color,
    //         mintedAt: block.timestamp,
    //         metadata: ""
    //     });

    //     // 存储小猫信息
    //     catInfos[newTokenId] = newCat;
    //     usedColors[color] = true;
    //     rarityCounts[rarity]++;

    //     // 如果是彩虹猫，记录特殊信息
    //     if (rarity == CatRarity.UR) {
    //         rainbowCatMinted = true;
    //         rainbowCatTokenId = newTokenId;
    //         emit RainbowCatFound(
    //             newTokenId,
    //             catName,
    //             msg.sender,
    //             block.timestamp
    //         );
    //     }

    //     // 添加到用户的小猫列表
    //     userCats[msg.sender].push(newTokenId);

    //     // 铸造NFT
    //     _safeMint(msg.sender, newTokenId);

    //     emit CatNFTMinted(
    //         newTokenId,
    //         catName,
    //         rarity,
    //         color,
    //         msg.sender,
    //         block.timestamp
    //     );
    // }

    /**
     * @dev 转移小猫NFT
     * @param tokenId NFT代币ID
     * @param to 接收地址
     */
    function transferCatNFT(uint256 tokenId, address to) external {
        require(_ownerOf(tokenId) != address(0), "Cat NFT does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(to != address(0), "Invalid recipient");

        // 转移NFT
        _transfer(msg.sender, to, tokenId);

        // 更新用户小猫列表
        _removeFromUserCats(msg.sender, tokenId);
        userCats[to].push(tokenId);

        emit CatNFTTransferred(tokenId, catInfos[tokenId].name, msg.sender, to);
    }

    /**
     * @dev 更新小猫元数据 (仅限合约拥有者)
     * @param tokenId NFT代币ID
     * @param metadata 元数据
     */
    function updateCatMetadata(
        uint256 tokenId,
        string memory metadata
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        catInfos[tokenId].metadata = metadata;
    }

    /**
     * @dev 生成社交抽卡的随机稀有度（基于互动次数提升概率）
     */
    function _generateSocialRarity(
        string memory nfcUID
    ) internal view returns (CatRarity) {
        uint256 socialBonus = totalDrawsUsed[nfcUID] * 50; // 每次抽卡增加0.5%的高稀有度概率
        uint256 random = _randomInRange(1, 10000);

        // 调整后的概率（社交奖励）
        uint256 adjustedURProb = UR_PROBABILITY + (socialBonus / 4); // UR概率提升最多
        uint256 adjustedSSRProb = SSR_PROBABILITY + (socialBonus / 2); // SSR次之
        uint256 adjustedSRProb = SR_PROBABILITY + socialBonus; // SR概率提升

        if (random <= adjustedURProb) {
            // 检查彩虹猫是否已被铸造
            if (rainbowCatMinted) {
                // 如果彩虹猫已被铸造，降级为SSR
                return CatRarity.SSR;
            }
            return CatRarity.UR;
        } else if (random <= adjustedURProb + adjustedSSRProb) {
            return CatRarity.SSR;
        } else if (
            random <= adjustedURProb + adjustedSSRProb + adjustedSRProb
        ) {
            return CatRarity.SR;
        } else {
            return CatRarity.R;
        }
    }

    /**
     * @dev 生成随机稀有度（传统方法）
     */
    function _generateRarity() internal view returns (CatRarity) {
        uint256 random = _randomInRange(1, 10000);

        if (random <= UR_PROBABILITY) {
            // 检查彩虹猫是否已被铸造
            if (rainbowCatMinted) {
                // 如果彩虹猫已被铸造，降级为SSR
                return CatRarity.SSR;
            }
            return CatRarity.UR;
        } else if (random <= UR_PROBABILITY + SSR_PROBABILITY) {
            return CatRarity.SSR;
        } else if (
            random <= UR_PROBABILITY + SSR_PROBABILITY + SR_PROBABILITY
        ) {
            return CatRarity.SR;
        } else {
            return CatRarity.R;
        }
    }

    /**
     * @dev 根据稀有度生成颜色
     */
    function _generateColor(
        CatRarity rarity
    ) internal view returns (string memory) {
        if (rarity == CatRarity.UR) {
            return "rainbow"; // 彩虹猫
        } else if (rarity == CatRarity.SSR) {
            // 紫猫或蓝猫
            uint256 random = _randomInRange(1, 2);
            return random == 1 ? "purple" : "blue";
        } else if (rarity == CatRarity.SR) {
            // 绿猫、红猫或橘猫
            uint256 random = _randomInRange(1, 3);
            if (random == 1) return "green";
            else if (random == 2) return "red";
            else return "orange";
        } else {
            return "black"; // R级黑猫
        }
    }

    /**
     * @dev 从用户小猫列表中移除
     */
    function _removeFromUserCats(address user, uint256 tokenId) internal {
        uint256[] storage cats = userCats[user];
        for (uint256 i = 0; i < cats.length; i++) {
            if (cats[i] == tokenId) {
                cats[i] = cats[cats.length - 1];
                cats.pop();
                break;
            }
        }
    }

    /**
     * @dev 生成指定范围内的随机数
     */
    function _randomInRange(
        uint256 min,
        uint256 max
    ) internal view returns (uint256) {
        require(max > min, "Invalid range");
        uint256 range = max - min + 1;
        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    _tokenIds
                )
            )
        );
        return (random % range) + min;
    }

    // 查询函数

    /**
     * @dev 获取用户的所有小猫
     */
    function getUserCats(
        address user
    ) external view returns (uint256[] memory) {
        return userCats[user];
    }

    /**
     * @dev 获取小猫信息
     */
    function getCatInfo(
        uint256 tokenId
    ) external view returns (CatInfo memory) {
        require(_ownerOf(tokenId) != address(0), "Cat NFT does not exist");
        return catInfos[tokenId];
    }

    /**
     * @dev 获取稀有度统计
     */
    function getRarityCounts()
        external
        view
        returns (
            uint256 rCount,
            uint256 srCount,
            uint256 ssrCount,
            uint256 urCount
        )
    {
        return (
            rarityCounts[CatRarity.R],
            rarityCounts[CatRarity.SR],
            rarityCounts[CatRarity.SSR],
            rarityCounts[CatRarity.UR]
        );
    }

    /**
     * @dev 检查彩虹猫是否已被铸造
     */
    function isRainbowCatMinted() external view returns (bool) {
        return rainbowCatMinted;
    }

    /**
     * @dev 获取彩虹猫的tokenId
     */
    function getRainbowCatTokenId() external view returns (uint256) {
        require(rainbowCatMinted, "Rainbow cat not minted yet");
        return rainbowCatTokenId;
    }

    /**
     * @dev 检查颜色是否已被使用
     */
    function isColorUsed(string memory color) external view returns (bool) {
        return usedColors[color];
    }

    /**
     * @dev 获取NFC的可用抽卡次数
     */
    function getAvailableDrawCount(
        string memory nfcUID
    ) external view returns (uint256) {
        return drawCounts[nfcUID];
    }

    /**
     * @dev 获取NFC的总抽卡次数（已使用）
     */
    function getTotalDrawsUsed(
        string memory nfcUID
    ) external view returns (uint256) {
        return totalDrawsUsed[nfcUID];
    }

    /**
     * @dev 获取NFC的抽卡统计信息
     */
    function getDrawStats(
        string memory nfcUID
    ) external view returns (uint256 available, uint256 used, uint256 total) {
        available = drawCounts[nfcUID];
        used = totalDrawsUsed[nfcUID];
        total = available + used;
    }

    /**
     * @dev 检查两个NFC是否已经互动过
     */
    function hasInteracted(
        string memory nfc1,
        string memory nfc2
    ) external view returns (bool) {
        return socialInteractions[nfc1][nfc2];
    }

    /**
     * @dev 获取NFC已互动过的所有NFC列表
     */
    function getInteractedNFCs(
        string memory nfcUID
    ) external view returns (string[] memory) {
        return interactedNFCs[nfcUID];
    }

    /**
     * @dev 获取用户可以获得的社交奖励概率
     */
    function getSocialBonus(
        string memory nfcUID
    ) external view returns (uint256) {
        return totalDrawsUsed[nfcUID] * 50; // 返回基点数
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
     * @dev 设置抽卡费用
     */
    function setDrawFee(uint256 newFee) external onlyOwner {
        drawFee = newFee;
    }

    /**
     * @dev 设置社交互动奖励
     */
    function setSocialInteractionReward(uint256 newReward) external onlyOwner {
        require(newReward > 0, "Reward must be greater than 0");
        socialInteractionReward = newReward;
    }

    /**
     * @dev 管理员添加抽卡次数（用于活动或初始化）
     */
    function addDrawTickets(
        string memory nfcUID,
        uint256 amount
    ) external onlyOwner {
        require(bytes(nfcUID).length > 0, "Invalid NFC UID");
        require(amount > 0, "Amount must be greater than 0");
        drawCounts[nfcUID] += amount;
    }

    /**
     * @dev 批量添加抽卡次数
     */
    function batchAddDrawTickets(
        string[] memory nfcUIDs,
        uint256[] memory amounts
    ) external onlyOwner {
        require(nfcUIDs.length == amounts.length, "Array length mismatch");

        for (uint256 i = 0; i < nfcUIDs.length; i++) {
            require(bytes(nfcUIDs[i]).length > 0, "Invalid NFC UID");
            require(amounts[i] > 0, "Amount must be greater than 0");
            drawCounts[nfcUIDs[i]] += amounts[i];
        }
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
     * @dev 提取合约余额
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev 紧急暂停抽卡功能
     */
    function emergencyPause() external onlyOwner {
        // 这里可以添加暂停逻辑
    }

    /**
     * @dev 恢复抽卡功能
     */
    function emergencyResume() external onlyOwner {
        // 这里可以添加恢复逻辑
    }

    /**
     * @dev 紧急重置NFC互动记录（仅限紧急情况）
     */
    function emergencyResetInteraction(
        string memory nfc1,
        string memory nfc2
    ) external onlyOwner {
        socialInteractions[nfc1][nfc2] = false;
        socialInteractions[nfc2][nfc1] = false;
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

    // 重写ERC721函数

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
