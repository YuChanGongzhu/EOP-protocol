// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/CatNFT_SocialDraw.sol";
import "../src/NFCWalletRegistry.sol";

contract SocialInteractionTest is Test {
    CatNFT catNFT;
    NFCWalletRegistry nfcRegistry;

    // Test users
    address user1 = address(0x1);
    address user2 = address(0x2);
    address unauthorizedUser = address(0x3);

    // Test NFC UIDs
    string nfc1 = "04:aa:bb:cc:dd:ee:ff";
    string nfc2 = "04:ff:ee:dd:cc:bb:aa";
    string nfc3 = "04:11:22:33:44:55:66";

    function setUp() public {
        // Deploy NFCWalletRegistry
        nfcRegistry = new NFCWalletRegistry();

        // Deploy CatNFT contract
        catNFT = new CatNFT(address(nfcRegistry));

        // Set user labels
        vm.label(user1, "User1");
        vm.label(user2, "User2");
        vm.label(unauthorizedUser, "UnauthorizedUser");

        // Give test users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(unauthorizedUser, 10 ether);

        // Since test contract is the owner, we can bind directly
        // (owner automatically has operator privileges)

        // Bind NFCs to users using detectAndBindBlankCard
        nfcRegistry.detectAndBindBlankCard(nfc1, user1);
        nfcRegistry.detectAndBindBlankCard(nfc2, user2);
        nfcRegistry.detectAndBindBlankCard(nfc3, unauthorizedUser);

        // Authorize user1 and user2 as operators for CatNFT
        catNFT.setAuthorizedOperator(user1, true);
        catNFT.setAuthorizedOperator(user2, true);
        // Do not authorize unauthorizedUser

        console.log("Setup complete");
        console.log("NFCRegistry:", address(nfcRegistry));
        console.log("CatNFT:", address(catNFT));
    }

    function testSocialInteractionBasic() public {
        console.log("Testing basic social interaction");

        // Check initial state
        assertEq(catNFT.getAvailableDrawCount(nfc1), 0);
        assertEq(catNFT.getAvailableDrawCount(nfc2), 0);

        // Check if already interacted
        assertFalse(catNFT.socialInteractions(nfc1, nfc2));

        // user1 uses nfc1 to interact with nfc2
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // Check results
        assertTrue(catNFT.socialInteractions(nfc1, nfc2));
        assertTrue(catNFT.socialInteractions(nfc2, nfc1));

        // Check draw tickets
        uint256 reward = catNFT.socialInteractionReward();
        assertEq(catNFT.getAvailableDrawCount(nfc1), reward);
        assertEq(catNFT.getAvailableDrawCount(nfc2), reward);

        console.log("Reward:", reward);
        console.log("NFC1 tickets:", catNFT.getAvailableDrawCount(nfc1));
        console.log("NFC2 tickets:", catNFT.getAvailableDrawCount(nfc2));

        console.log("Basic test passed");
    }

    function testSocialInteractionUnauthorized() public {
        console.log("Testing unauthorized user social interaction");

        // unauthorizedUser tries to use nfc3 to interact with nfc1
        vm.prank(unauthorizedUser);
        vm.expectRevert("Not authorized operator");
        catNFT.socialInteraction(nfc3, nfc1);

        console.log("Unauthorized user correctly rejected");
    }

    function testSocialInteractionSameNFC() public {
        console.log("Testing same NFC self interaction");

        // user1 tries to interact nfc1 with itself
        vm.prank(user1);
        vm.expectRevert("Cannot interact with yourself");
        catNFT.socialInteraction(nfc1, nfc1);

        console.log("Self interaction correctly rejected");
    }

    function testSocialInteractionUnboundNFC() public {
        console.log("Testing interaction with unbound NFC");

        string memory unboundNFC = "04:99:99:99:99:99:99";

        // user1 tries to interact with unbound NFC
        vm.prank(user1);
        vm.expectRevert("Other NFC not registered");
        catNFT.socialInteraction(nfc1, unboundNFC);

        console.log("Unbound NFC interaction correctly rejected");
    }

    function testSocialInteractionWrongOwner() public {
        console.log("Testing interaction with others NFC");

        // user1 tries to use user2's nfc2 to interact with nfc1
        vm.prank(user1);
        vm.expectRevert("You don't own this NFC");
        catNFT.socialInteraction(nfc2, nfc1);

        console.log("Using others NFC correctly rejected");
    }

    function testSocialInteractionDuplicate() public {
        console.log("Testing duplicate social interaction");

        // First interaction
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // Try duplicate interaction
        vm.prank(user1);
        vm.expectRevert("Already interacted with this NFC");
        catNFT.socialInteraction(nfc1, nfc2);

        // Reverse should also fail
        vm.prank(user2);
        vm.expectRevert("Already interacted with this NFC");
        catNFT.socialInteraction(nfc2, nfc1);

        console.log("Duplicate interaction correctly rejected");
    }

    function testDrawCatWithTicketsAfterSocialInteraction() public {
        console.log("Testing draw cat with tickets after social interaction");

        // First do social interaction to get tickets
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        uint256 initialTickets = catNFT.getAvailableDrawCount(nfc1);
        console.log("Tickets after interaction:", initialTickets);

        // Use tickets to draw NFT
        uint256 fee = catNFT.drawFee();
        vm.prank(user1);
        catNFT.drawCatNFTWithTickets{value: fee}(nfc1, "TestCat");

        // Check tickets decreased
        uint256 remainingTickets = catNFT.getAvailableDrawCount(nfc1);
        assertEq(remainingTickets, initialTickets - 1);

        // Check total used count
        assertEq(catNFT.getTotalDrawsUsed(nfc1), 1);

        console.log("Remaining tickets:", remainingTickets);
        console.log("Total used:", catNFT.getTotalDrawsUsed(nfc1));

        console.log("Draw with tickets test passed");
    }

    // Test comprehensive scenario like in real backend
    function testRealWorldScenario() public {
        console.log("Testing real world scenario");

        // Check initial authorization status
        assertTrue(
            catNFT.authorizedOperators(user1),
            "User1 should be authorized"
        );
        assertTrue(
            catNFT.authorizedOperators(user2),
            "User2 should be authorized"
        );

        // Check NFC binding status
        assertTrue(nfcRegistry.isNFCBound(nfc1), "NFC1 should be bound");
        assertTrue(nfcRegistry.isNFCBound(nfc2), "NFC2 should be bound");

        // Get NFC binding info
        NFCWalletRegistry.NFCBinding memory binding1 = nfcRegistry
            .getNFCBinding(nfc1);
        NFCWalletRegistry.NFCBinding memory binding2 = nfcRegistry
            .getNFCBinding(nfc2);

        assertEq(
            binding1.walletAddress,
            user1,
            "NFC1 should be owned by user1"
        );
        assertEq(
            binding2.walletAddress,
            user2,
            "NFC2 should be owned by user2"
        );

        // Execute social interaction
        vm.prank(user1);
        catNFT.socialInteraction(nfc1, nfc2);

        // Verify results match expected behavior
        uint256 reward = catNFT.socialInteractionReward();
        assertEq(catNFT.getAvailableDrawCount(nfc1), reward);
        assertEq(catNFT.getAvailableDrawCount(nfc2), reward);

        assertTrue(catNFT.socialInteractions(nfc1, nfc2));

        console.log("Real world scenario test passed");
    }
}
