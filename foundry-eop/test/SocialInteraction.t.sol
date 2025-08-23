// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/CatNFT_SocialDraw.sol";
import "../src/NFCWalletRegistry.sol";

contract SocialInteractionTest is Test {
    CatNFT catNFT;
    NFCWalletRegistry nfcRegistry;

    // 测试用户
    address user1 = address(0x1);
    address user2 = address(0x2);
    address unauthorizedUser = address(0x3);

    // 测试NFC UIDs
    string nfc1 = "04:aa:bb:cc:dd:ee:ff";
    string nfc2 = "04:ff:ee:dd:cc:bb:aa";
    string nfc3 = "04:11:22:33:44:55:66";

    function setUp() public {
        // 部署NFCWalletRegistry
        nfcRegistry = new NFCWalletRegistry();

        // 部署CatNFT合约
        catNFT = new CatNFT(address(nfcRegistry));

    // 让 Registry 知道 CatNFT 合约（用于自动授权等）
    nfcRegistry.setCatNFTContract(address(catNFT));

        // 设置用户标签
        vm.label(user1, "User1");
        vm.label(user2, "User2");
        vm.label(unauthorizedUser, "UnauthorizedUser");

        // 给测试用户一些ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(unauthorizedUser, 10 ether);

    // 绑定NFC到用户（通过检测空白卡 + 初始化），由合约owner作为授权操作者执行
    nfcRegistry.detectAndBindBlankCard(nfc1, user1);
    nfcRegistry.initializeBlankCard(nfc1, "user1");

    nfcRegistry.detectAndBindBlankCard(nfc2, user2);
    nfcRegistry.initializeBlankCard(nfc2, "user2");

    nfcRegistry.detectAndBindBlankCard(nfc3, unauthorizedUser);
    nfcRegistry.initializeBlankCard(nfc3, "user3");

        // 授权user1和user2为操作者
        catNFT.setAuthorizedOperator(user1, true);
        catNFT.setAuthorizedOperator(user2, true);
        // 不授权unauthorizedUser

        console.log("=== Test Environment Setup Complete ===");
        console.log("NFCRegistry address:", address(nfcRegistry));
        console.log("CatNFT address:", address(catNFT));
        console.log("User1 address:", user1);
        console.log("User2 address:", user2);
        console.log("UnauthorizedUser address:", unauthorizedUser);
    }

    function testSocialInteractionBasic() public {
        console.log("\n=== Test Basic Social Interaction ===");

        // Check initial state
        assertEq(
            catNFT.getAvailableDrawCount(nfc1),
            0,
            "NFC1 initial draw count should be 0"
        );
        assertEq(
            catNFT.getAvailableDrawCount(nfc2),
            0,
            "NFC2 initial draw count should be 0"
        );

        // Check if already interacted
        assertFalse(
            catNFT.socialInteractions(nfc1, nfc2),
            "NFC1 and NFC2 should not have interacted yet"
        );

        // user1 uses nfc1 to interact with nfc2
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // Check results
        assertTrue(
            catNFT.socialInteractions(nfc1, nfc2),
            "NFC1 and NFC2 should have interacted"
        );
        assertTrue(
            catNFT.socialInteractions(nfc2, nfc1),
            "Interaction should be bidirectional"
        );

        // Check draw tickets
        uint256 reward = catNFT.socialInteractionReward();
        assertEq(
            catNFT.getAvailableDrawCount(nfc1),
            reward,
            "NFC1 should receive social interaction reward"
        );
        assertEq(
            catNFT.getAvailableDrawCount(nfc2),
            reward,
            "NFC2 should receive social interaction reward"
        );

        console.log("Social interaction reward:", reward);
        console.log("NFC1 draw tickets:", catNFT.getAvailableDrawCount(nfc1));
        console.log("NFC2 draw tickets:", catNFT.getAvailableDrawCount(nfc2));

    console.log("Basic social interaction test passed");
    }

    function testSocialInteractionUnauthorized() public {
    console.log("\n=== Test unauthorized user social interaction ===");

        // unauthorizedUser尝试使用nfc3与nfc1进行社交互动
        vm.prank(unauthorizedUser);
        vm.expectRevert("Not authorized operator");
        catNFT.socialInteraction(nfc3, nfc1);

    console.log("Unauthorized user correctly rejected");
    }

    function testSocialInteractionSameNFC() public {
    console.log("\n=== Test self interaction with same NFC ===");

        // user1尝试使用nfc1与自己互动
        vm.prank(user1);
        vm.expectRevert("Cannot interact with yourself");
        catNFT.socialInteraction(nfc1, nfc1);

    console.log("Self interaction correctly rejected");
    }

    function testSocialInteractionUnboundNFC() public {
    console.log("\n=== Test interaction with unbound NFC ===");

        string memory unboundNFC = "04:99:99:99:99:99:99";

        // user1尝试与未绑定的NFC互动
        vm.prank(user1);
        vm.expectRevert("Other NFC not registered");
        catNFT.socialInteraction(nfc1, unboundNFC);

    console.log("Interaction with unbound NFC correctly rejected");
    }

    function testSocialInteractionWrongOwner() public {
    console.log("\n=== Test interaction using other's NFC ===");

        // user1尝试使用user2的nfc2与nfc1互动（user1不拥有nfc2）
        vm.prank(user1);
        vm.expectRevert("You don't own this NFC");
        catNFT.socialInteraction(nfc2, nfc1);

    console.log("Using others' NFC correctly rejected");
    }

    function testSocialInteractionDuplicate() public {
    console.log("\n=== Test duplicate social interaction ===");

        // 第一次互动
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // 尝试重复互动
        vm.prank(user1);
        vm.expectRevert("Already interacted with this NFC");
        catNFT.socialInteraction(nfc1, nfc2);

        // 反向也应该失败
        vm.prank(user2);
        vm.expectRevert("Already interacted with this NFC");
        catNFT.socialInteraction(nfc2, nfc1);

    console.log("Duplicate interaction correctly rejected");
    }

    function testSocialInteractionEvents() public {
    console.log("\n=== Test social interaction events ===");

        uint256 reward = catNFT.socialInteractionReward();

        // 期望的事件
        vm.expectEmit(true, true, true, true);
        emit SocialInteractionCompleted(nfc1, nfc2, reward, reward);

        vm.expectEmit(true, true, true, true);
        emit SocialInteractionCompleted(nfc2, nfc1, reward, reward);

        // 执行社交互动
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

    console.log("Social interaction event emitted correctly");
    }

    function testSocialInteractionReward() public {
    console.log("\n=== Test social interaction reward mechanism ===");

        uint256 initialReward = catNFT.socialInteractionReward();
    console.log("Initial reward:", initialReward);

        // 执行社交互动
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // 检查抽卡券
        assertEq(catNFT.getAvailableDrawCount(nfc1), initialReward);
        assertEq(catNFT.getAvailableDrawCount(nfc2), initialReward);

        // 测试奖励设置（只有owner可以设置）
        catNFT.setSocialInteractionReward(5);
        assertEq(catNFT.socialInteractionReward(), 5);

    console.log("Social interaction reward mechanism correct");
    }

    function testMultipleSocialInteractions() public {
    console.log("\n=== Test multiple different social interactions ===");

    // 绑定第三个NFC给user1
        string memory nfc4 = "04:aa:aa:aa:aa:aa:aa";
    nfcRegistry.detectAndBindBlankCard(nfc4, user1);
    nfcRegistry.initializeBlankCard(nfc4, "user1-2");

        uint256 reward = catNFT.socialInteractionReward();

        // nfc1 与 nfc2 互动
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // nfc1 与 nfc4 互动（user1拥有两个NFC）
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc4);

        // 检查结果
        assertEq(
            catNFT.getAvailableDrawCount(nfc1),
            reward * 2,
            "NFC1 should have rewards from 2 interactions"
        );
        assertEq(
            catNFT.getAvailableDrawCount(nfc2),
            reward,
            "NFC2 should have rewards from 1 interaction"
        );
        assertEq(
            catNFT.getAvailableDrawCount(nfc4),
            reward,
            "NFC4 should have rewards from 1 interaction"
        );

    console.log("NFC1 tickets:", catNFT.getAvailableDrawCount(nfc1));
    console.log("NFC2 tickets:", catNFT.getAvailableDrawCount(nfc2));
    console.log("NFC4 tickets:", catNFT.getAvailableDrawCount(nfc4));

    console.log("Multiple social interaction tests passed");
    }

    // 测试使用抽卡券后的状态
    function testDrawCatWithTicketsAfterSocialInteraction() public {
    console.log("\n=== Test using tickets after social interaction ===");

        // 先进行社交互动获得抽卡券
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        uint256 initialTickets = catNFT.getAvailableDrawCount(nfc1);
    console.log("Tickets after interaction:", initialTickets);

        // 使用抽卡券抽取NFT
        vm.prank(user1);
        catNFT.drawCatNFTWithTickets{value: catNFT.drawFee()}(nfc1, "TestCat");

        // 检查抽卡券减少
        uint256 remainingTickets = catNFT.getAvailableDrawCount(nfc1);
    assertEq(remainingTickets, initialTickets - 1, "Tickets should decrease by 1");

        // 检查总使用次数
    assertEq(catNFT.getTotalDrawsUsed(nfc1), 1, "Total draws used should be 1");

    console.log("Remaining tickets:", remainingTickets);
    console.log("Total draws used:", catNFT.getTotalDrawsUsed(nfc1));

    console.log("Ticket usage tests passed");
    }

    // 事件定义（用于测试）
    event SocialInteractionCompleted(
        string indexed myNFC,
        string indexed otherNFC,
        uint256 rewardedDraws,
        uint256 totalDrawsAvailable
    );
}
