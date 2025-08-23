// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../src/INJDomainNFT.sol";

contract INJDomainNFTTest is Test {
    INJDomainNFT public domainNFT;

    address public owner;
    address public user1;
    address public user2;

    string public constant DOMAIN_PREFIX = "alice";
    string public constant NFC_UID = "04:1a:2b:3c:4d:5e:6f";
    string public constant METADATA_URI =
        "https://example.com/metadata/domain.json";

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

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // 部署一个模拟的NFCWalletRegistry合约用于测试
        address mockNFCRegistry = address(0x1); // 使用简单地址进行测试
        domainNFT = new INJDomainNFT(mockNFCRegistry);
    }

    // ============ 基础功能测试 ============

    function testDeployment() public view {
        assertEq(domainNFT.name(), "INJ Domain NFT");
        assertEq(domainNFT.symbol(), "INJDN");
        assertEq(domainNFT.owner(), owner);
        assertEq(domainNFT.registrationFee(), 0);
        assertEq(domainNFT.MIN_DOMAIN_LENGTH(), 1);
        assertEq(domainNFT.MAX_DOMAIN_LENGTH(), 30);
    }

    function testMintDomainNFT() public {
        vm.startPrank(user1);

        vm.expectEmit(true, true, true, true);
        emit DomainNFTMinted(1, "advx-alice.inj", user1, block.timestamp);

        // 铸造域名NFT
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);

        // 验证NFT所有权
        assertEq(domainNFT.ownerOf(1), user1);

        // 验证域名信息
        (
            string memory domainName,
            address domainOwner,
            string memory nfcUID,
            uint256 registeredAt,
            bool isActive,
            string memory metadata
        ) = domainNFT.domainInfos(1);

        assertEq(domainName, "advx-alice.inj");
        assertEq(domainOwner, user1);
        assertEq(nfcUID, NFC_UID);
        assertTrue(isActive);
        assertTrue(registeredAt > 0);

        // 验证映射关系
        assertEq(domainNFT.domainToTokenId("advx-alice.inj"), 1);
        assertEq(domainNFT.nfcToTokenId(NFC_UID), 1);

        // 验证主域名设置
        assertEq(domainNFT.primaryDomainTokenId(user1), 1);

        vm.stopPrank();
    }

    function testMintDomainNFTInvalidInput() public {
        vm.startPrank(user1);

        // 测试过长的域名（超出MAX_DOMAIN_LENGTH-5的限制）
        vm.expectRevert("Invalid domain suffix");
        domainNFT.mintDomainNFT{value: 0}(
            "verylongdomainnamethatexceedsthelimit",
            NFC_UID,
            METADATA_URI
        );

        // 测试空NFC UID
        vm.expectRevert("Invalid NFC UID");
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, "", METADATA_URI);

        vm.stopPrank();
    }

    function testMintDuplicateDomain() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        vm.startPrank(user2);
        vm.expectRevert("Domain already registered");
        domainNFT.mintDomainNFT{value: 0}(
            DOMAIN_PREFIX,
            "04:2a:3b:4c:5d:6e:7f",
            METADATA_URI
        );
        vm.stopPrank();
    }

    function testMintDuplicateNFC() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        vm.startPrank(user2);
        vm.expectRevert("NFC already bound to domain");
        domainNFT.mintDomainNFT{value: 0}("bob", NFC_UID, METADATA_URI);
        vm.stopPrank();
    }

    // ============ 转移功能测试 ============

    function testUnbindAndTransferDomain() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        vm.startPrank(user1);
        vm.expectEmit(true, true, true, true);
        emit DomainNFTTransferred(1, "advx-alice.inj", user1, user2);

        domainNFT.unbindAndTransferDomain(NFC_UID, user2);
        vm.stopPrank();

        // 验证转移后状态
        assertEq(domainNFT.ownerOf(1), user2);
        assertEq(domainNFT.nfcToTokenId(NFC_UID), 0); // NFC解绑

        (, , , , bool isActive, ) = domainNFT.domainInfos(1);
        assertFalse(isActive); // 域名变为非激活状态
    }

    function testUnbindAndTransferDomainUnauthorized() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        vm.startPrank(user2);
        vm.expectRevert("Only domain owner can transfer");
        domainNFT.unbindAndTransferDomain(NFC_UID, user2);
        vm.stopPrank();
    }

    // ============ 主域名功能测试 ============

    function testSetPrimaryDomain() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        domainNFT.mintDomainNFT{value: 0}(
            "bob",
            "04:2a:3b:4c:5d:6e:7f",
            METADATA_URI
        );

        vm.expectEmit(true, true, true, true);
        emit PrimaryDomainSet(user1, 2, "advx-bob.inj");

        domainNFT.setPrimaryDomain(2);

        assertEq(domainNFT.primaryDomainTokenId(user1), 2);
        vm.stopPrank();
    }

    function testSetPrimaryDomainUnauthorized() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        vm.startPrank(user2);
        vm.expectRevert("Not token owner");
        domainNFT.setPrimaryDomain(1);
        vm.stopPrank();
    }

    // ============ 查询功能测试 ============

    function testGetTokenURI() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        // 测试获取Token URI
        string memory tokenURI = domainNFT.tokenURI(1);
        assertEq(tokenURI, METADATA_URI);
    }

    function testQueryDomainMappings() public {
        vm.startPrank(user1);
        domainNFT.mintDomainNFT{value: 0}(DOMAIN_PREFIX, NFC_UID, METADATA_URI);
        vm.stopPrank();

        // 验证映射关系
        assertEq(domainNFT.domainToTokenId("advx-alice.inj"), 1);
        assertEq(domainNFT.nfcToTokenId(NFC_UID), 1);
        assertEq(domainNFT.primaryDomainTokenId(user1), 1);

        // 验证用户token关系 (通过索引访问第一个token)
        uint256 firstUserToken = domainNFT.userTokenIds(user1, 0);
        assertEq(firstUserToken, 1);
    }
}
