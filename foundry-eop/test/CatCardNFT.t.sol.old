// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../src/CatNFT.sol";
import "../src/NFCWalletRegistry.sol";

contract CatCardNFTTest is Test {
    CatNFT public catNFT;
    NFCWalletRegistry public nfcRegistry;

    address public owner;
    address public user1;
    address public user2;
    address public unauthorizedUser;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        unauthorizedUser = makeAddr("unauthorizedUser");

        nfcRegistry = new NFCWalletRegistry();
        catNFT = new CatNFT();
    }

    // ============ 基础功能测试 ============

    function testDeployment() public view {
        assertEq(catNFT.owner(), owner);
        assertEq(catNFT.name(), "Cat NFT");
        assertEq(catNFT.symbol(), "CAT");
    }

    function testDrawCatNFT() public {
        vm.deal(user1, 1 ether);

        vm.prank(user1);
        catNFT.drawCatNFT{value: 0.1 ether}("TestCat");

        uint256[] memory userCats = catNFT.getUserCats(user1);
        assertEq(userCats.length, 1);
        assertEq(catNFT.ownerOf(userCats[0]), user1);

        CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(userCats[0]);
        assertEq(catInfo.name, "TestCat");
        assertTrue(catInfo.mintedAt > 0);
    }

    function testDrawFeeRequirement() public {
        vm.deal(user1, 1 ether);

        vm.prank(user1);
        vm.expectRevert("Insufficient draw fee");
        catNFT.drawCatNFT{value: 0.05 ether}("TestCat");
    }

    function testDuplicateNameRejection() public {
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);

        vm.prank(user1);
        catNFT.drawCatNFT{value: 0.1 ether}("TestCat");

        vm.prank(user2);
        vm.expectRevert("Cat name already used");
        catNFT.drawCatNFT{value: 0.1 ether}("TestCat");
    }

    function testTransferCatNFT() public {
        vm.deal(user1, 1 ether);

        vm.prank(user1);
        catNFT.drawCatNFT{value: 0.1 ether}("TransferCat");

        uint256[] memory userCats = catNFT.getUserCats(user1);
        uint256 tokenId = userCats[0];

        vm.prank(user1);
        catNFT.transferCatNFT(tokenId, user2);

        assertEq(catNFT.ownerOf(tokenId), user2);
        assertEq(catNFT.getUserCats(user1).length, 0);
        assertEq(catNFT.getUserCats(user2).length, 1);
    }

    function testUpdateCatMetadata() public {
        vm.deal(user1, 1 ether);

        vm.prank(user1);
        catNFT.drawCatNFT{value: 0.1 ether}("MetadataCat");

        uint256[] memory userCats = catNFT.getUserCats(user1);
        uint256 tokenId = userCats[0];

        vm.prank(user1);
        catNFT.updateCatMetadata(tokenId, "Updated metadata");

        CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(tokenId);
        assertEq(catInfo.metadata, "Updated metadata");
    }

    function testGetRarityCounts() public {
        vm.deal(user1, 10 ether);

        // Draw multiple cats to test rarity distribution
        vm.startPrank(user1);
        catNFT.drawCatNFT{value: 0.1 ether}("Cat1");
        catNFT.drawCatNFT{value: 0.1 ether}("Cat2");
        catNFT.drawCatNFT{value: 0.1 ether}("Cat3");
        vm.stopPrank();

        (
            uint256 rCount,
            uint256 srCount,
            uint256 ssrCount,
            uint256 urCount
        ) = catNFT.getRarityCounts();

        // Should have at least some cats minted
        assertTrue((rCount + srCount + ssrCount + urCount) >= 3);
    }

    function testNameAndColorChecks() public view {
        // Test unused name and color
        assertFalse(catNFT.isNameUsed("UnusedName"));
        assertFalse(catNFT.isColorUsed("unused_color"));
    }

    function testOnlyOwnerFunctions() public {
        // Test setDrawFee
        vm.prank(user1);
        vm.expectRevert();
        catNFT.setDrawFee(0.2 ether);

        // Owner should be able to set draw fee
        vm.prank(owner);
        catNFT.setDrawFee(0.2 ether);

        // Test withdraw
        vm.prank(user1);
        vm.expectRevert();
        catNFT.withdraw();
    }
}
