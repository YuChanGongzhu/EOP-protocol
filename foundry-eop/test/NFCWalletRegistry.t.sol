// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../src/NFCWalletRegistry.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFCWalletRegistryTest is Test {
    NFCWalletRegistry public registry;

    address public owner;
    address public operator;
    address public user1;
    address public user2;
    address public unauthorizedUser;

    string constant NFC_UID_1 = "04:1a:2b:3c:4d:5e:6f";
    string constant NFC_UID_2 = "04:2a:3b:4c:5d:6e:7f";
    string constant NFC_UID_3 = "04:3a:4b:5c:6d:7e:8f";

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
    event OperatorAuthorized(string indexed operatorId, bool authorized);

    function setUp() public {
        owner = makeAddr("owner");
        operator = makeAddr("operator");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        unauthorizedUser = makeAddr("unauthorizedUser");

        vm.startPrank(owner);
        registry = new NFCWalletRegistry();

        // 授权操作者 - 使用与合约一致的地址字符串格式
        string memory operatorId = toHexString(operator);
        registry.authorizeOperator(operatorId, true);
        vm.stopPrank();
    }

    // 帮助函数：将地址转换为十六进制字符串（与合约内addressToString一致）
    function toHexString(address addr) internal pure returns (string memory) {
        return Strings.toHexString(uint160(addr), 20);
    }

    // ============ 基础功能测试 ============

    function testDeployment() public {
        assertEq(registry.owner(), owner);
        assertEq(registry.totalBindings(), 0);
        assertEq(registry.totalUnbindings(), 0);
    }

    function testOperatorAuthorization() public {
        string memory operatorId = toHexString(operator);
        assertTrue(registry.authorizedOperators(operatorId));

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit OperatorAuthorized(operatorId, false);
        registry.authorizeOperator(operatorId, false);

        assertFalse(registry.authorizedOperators(operatorId));
    }

    function testUnauthorizedCannotSetOperator() public {
        string memory operatorId = toHexString(unauthorizedUser);

        vm.prank(unauthorizedUser);
        vm.expectRevert();
        registry.authorizeOperator(operatorId, true);
    }

    // ============ NFC绑定测试 ============

    function testDetectAndBindBlankCardBasic() public {
        vm.prank(operator);
        vm.expectEmit(true, true, false, true);
        emit BlankCardDetected(NFC_UID_1, user1, block.timestamp);

        bool result = registry.detectAndBindBlankCard(NFC_UID_1, user1);
        assertTrue(result);

        // 验证绑定信息
        (
            address walletAddress,
            uint256 boundAt,
            uint256 unboundAt,
            bool isActive,
            bool isBlank,
            string memory metadata
        ) = registry.nfcBindings(NFC_UID_1);

        assertEq(walletAddress, user1);
        assertEq(boundAt, block.timestamp);
        assertEq(unboundAt, 0);
        assertTrue(isActive);
        assertTrue(isBlank);
        assertEq(metadata, "auto_created");

        // 验证统计信息
        assertEq(registry.totalBindings(), 1);
        assertTrue(registry.isNFCBound(NFC_UID_1));
        assertEq(registry.getWalletNFC(user1), NFC_UID_1);
    }

    function testDetectAndBindBlankCardInvalidInputs() public {
        vm.startPrank(operator);

        // 测试空 UID
        vm.expectRevert("Invalid NFC UID");
        registry.detectAndBindBlankCard("", user1);

        // 测试零地址
        vm.expectRevert("Invalid wallet address");
        registry.detectAndBindBlankCard(NFC_UID_1, address(0));

        vm.stopPrank();
    }

    function testDetectAndBindBlankCardAlreadyBound() public {
        vm.startPrank(operator);

        // 先绑定一次
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        // 尝试重复绑定
        bool result = registry.detectAndBindBlankCard(NFC_UID_1, user2);
        assertFalse(result); // 应该返回false而不是revert

        vm.stopPrank();
    }

    function testUnauthorizedCannotDetectAndBind() public {
        vm.prank(unauthorizedUser);
        vm.expectRevert("Not authorized operator");
        registry.detectAndBindBlankCard(NFC_UID_1, user1);
    }

    // ============ 空白卡检测测试 ============

    function testDetectAndBindBlankCard() public {
        vm.prank(operator);
        vm.expectEmit(true, true, false, true);
        emit BlankCardDetected(NFC_UID_1, user1, block.timestamp);

        bool result = registry.detectAndBindBlankCard(NFC_UID_1, user1);
        assertTrue(result);

        // 验证空白卡信息
        (
            address walletAddress,
            uint256 boundAt,
            uint256 unboundAt,
            bool isActive,
            bool isBlank,
            string memory metadata
        ) = registry.nfcBindings(NFC_UID_1);

        assertEq(walletAddress, user1);
        assertTrue(isActive);
        assertTrue(isBlank);
        assertEq(metadata, "auto_created");

        // 验证历史记录
        assertTrue(registry.isBlankCard(NFC_UID_1));
    }

    function testDetectBlankCardAlreadyBound() public {
        vm.startPrank(operator);

        // 先绑定一个卡
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        // 尝试检测已绑定的卡
        bool result = registry.detectAndBindBlankCard(NFC_UID_1, user2);
        assertFalse(result);

        vm.stopPrank();
    }

    function testInitializeBlankCard() public {
        vm.startPrank(operator);

        // 先检测空白卡
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        // 初始化空白卡
        string memory initMetadata = "initialized_by_user";
        vm.expectEmit(true, true, false, true);
        emit CardInitialized(NFC_UID_1, user1, block.timestamp);

        registry.initializeBlankCard(NFC_UID_1, initMetadata);

        // 验证初始化后状态
        (, , , , bool isBlank, string memory metadata) = registry.nfcBindings(
            NFC_UID_1
        );
        assertFalse(isBlank);
        assertEq(metadata, initMetadata);
        assertFalse(registry.isBlankCard(NFC_UID_1));

        vm.stopPrank();
    }

    function testInitializeBlankCardInvalidStates() public {
        vm.startPrank(operator);

        // 尝试初始化未绑定的卡
        vm.expectRevert("NFC not bound");
        registry.initializeBlankCard(NFC_UID_1, "test");

        // 先绑定空白卡，然后初始化，再尝试重复初始化
        registry.detectAndBindBlankCard(NFC_UID_1, user1);
        registry.initializeBlankCard(NFC_UID_1, "test");

        // 尝试重复初始化
        vm.expectRevert("Card is not blank");
        registry.initializeBlankCard(NFC_UID_1, "test");

        vm.stopPrank();
    }

    // ============ 批量操作测试 ============

    function testBatchDetectBlankCards() public {
        string[] memory nfcUIDs = new string[](3);
        address[] memory walletAddresses = new address[](3);

        nfcUIDs[0] = NFC_UID_1;
        nfcUIDs[1] = NFC_UID_2;
        nfcUIDs[2] = NFC_UID_3;

        walletAddresses[0] = user1;
        walletAddresses[1] = user2;
        walletAddresses[2] = makeAddr("user3");

        vm.prank(operator);
        uint256 successCount = registry.batchDetectBlankCards(
            nfcUIDs,
            walletAddresses
        );

        assertEq(successCount, 3);
        assertEq(registry.totalBindings(), 3);

        // 验证所有卡都被正确绑定
        for (uint256 i = 0; i < 3; i++) {
            assertTrue(registry.isNFCBound(nfcUIDs[i]));
            assertTrue(registry.isBlankCard(nfcUIDs[i]));
            assertEq(registry.getWalletNFC(walletAddresses[i]), nfcUIDs[i]);
        }
    }

    function testBatchDetectBlankCardsArrayMismatch() public {
        string[] memory nfcUIDs = new string[](2);
        address[] memory walletAddresses = new address[](3);

        vm.prank(operator);
        vm.expectRevert("Array length mismatch");
        registry.batchDetectBlankCards(nfcUIDs, walletAddresses);
    }

    function testBatchDetectBlankCardsPartialSuccess() public {
        // 先绑定一个卡
        vm.prank(operator);
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        string[] memory nfcUIDs = new string[](3);
        address[] memory walletAddresses = new address[](3);

        nfcUIDs[0] = NFC_UID_1; // 已绑定
        nfcUIDs[1] = NFC_UID_2; // 新卡
        nfcUIDs[2] = NFC_UID_3; // 新卡

        walletAddresses[0] = makeAddr("anotherUser"); // 不同地址
        walletAddresses[1] = user2;
        walletAddresses[2] = makeAddr("user3");

        vm.prank(operator);
        uint256 successCount = registry.batchDetectBlankCards(
            nfcUIDs,
            walletAddresses
        );

        assertEq(successCount, 2); // 只有2个新卡成功
        assertEq(registry.totalBindings(), 3); // 总共3个绑定
    }

    // ============ 查询功能测试 ============

    function testBasicQueries() public {
        vm.startPrank(operator);

        // 绑定卡片
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        vm.stopPrank();

        // 测试基本查询
        assertTrue(registry.isNFCBound(NFC_UID_1));
        assertTrue(registry.isBlankCard(NFC_UID_1));
        assertEq(registry.getWalletNFC(user1), NFC_UID_1);
        assertTrue(registry.isWalletBound(user1));
    }

    function testGetNFCBinding() public {
        vm.startPrank(operator);

        // 绑定空白卡
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        vm.stopPrank();

        // 获取绑定信息
        NFCWalletRegistry.NFCBinding memory binding = registry.getNFCBinding(
            NFC_UID_1
        );
        assertEq(binding.walletAddress, user1);
        assertTrue(binding.isActive);
        assertTrue(binding.isBlank);
        assertEq(binding.metadata, "auto_created");
    }

    // ============ 解绑功能测试 ============

    function testEmergencyUnbindNFCWallet() public {
        vm.startPrank(operator);

        // 先绑定一个卡
        registry.detectAndBindBlankCard(NFC_UID_1, user1);

        // 授权操作者紧急解绑
        vm.expectEmit(true, true, false, true);
        emit NFCWalletUnbound(NFC_UID_1, user1, block.timestamp, true);

        registry.emergencyUnbindNFCWallet(NFC_UID_1);

        vm.stopPrank();

        // 验证解绑后状态
        assertFalse(registry.isNFCBound(NFC_UID_1));
        assertEq(registry.getWalletNFC(user1), "");
        assertFalse(registry.isWalletBound(user1));
        assertEq(registry.totalBindings(), 0);
        assertEq(registry.totalUnbindings(), 1);
    }

    // ============ Edge Cases 测试 ============

    function testQueryNonExistentNFC() public {
        assertFalse(registry.isNFCBound("non_existent"));
        assertTrue(registry.isBlankCard("non_existent")); // 未绑定的都是空白卡
    }

    function testEmptyWalletQueries() public {
        assertEq(registry.getWalletNFC(user1), "");
        assertFalse(registry.isWalletBound(user1));
    }

    // ============ 权限测试 ============

    function testOnlyOwnerFunctions() public {
        vm.startPrank(unauthorizedUser);

        vm.expectRevert();
        registry.authorizeOperator("test", true);

        vm.stopPrank();
    }

    // ============ 气体优化测试 ============

    function testGasOptimization() public {
        vm.startPrank(operator);

        // 测试单个绑定的气体消耗
        uint256 gasBefore = gasleft();
        registry.detectAndBindBlankCard(NFC_UID_1, user1);
        uint256 gasUsed = gasBefore - gasleft();

        // 验证气体消耗在合理范围内（具体值需要根据实际情况调整）
        assertTrue(gasUsed < 300000, "Single bind gas usage too high");

        vm.stopPrank();
    }
}
