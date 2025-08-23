// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import "../src/CatNFT.sol";

contract CatNFTTest is Test {
    CatNFT public catNFT;

    address public owner;
    address public user1;
    address public user2;
    address public user3;

    uint256 public constant DRAW_FEE = 0.1 ether;

    event CatNFTMinted(
        uint256 indexed tokenId,
        string indexed name,
        CatNFT.CatRarity rarity,
        string color,
        address indexed owner,
        uint256 mintedAt
    );

    event RainbowCatFound(
        uint256 indexed tokenId,
        string indexed name,
        address indexed finder,
        uint256 mintedAt
    );

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");

        catNFT = new CatNFT();

        // 给用户一些ETH用于抽卡
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
    }

    function testConstructor() public {
        assertEq(catNFT.name(), "Cat NFT");
        assertEq(catNFT.symbol(), "CAT");
        assertEq(catNFT.owner(), owner);
        assertEq(catNFT.drawFee(), DRAW_FEE);
        assertEq(catNFT.MAX_CATS_PER_USER(), 100);
    }

    function testDrawCatNFT() public {
        vm.startPrank(user1);

        uint256 initialBalance = user1.balance;

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        // 验证余额变化
        assertEq(user1.balance, initialBalance - DRAW_FEE);

        // 验证NFT创建
        assertEq(catNFT.ownerOf(1), user1);

        // 验证小猫信息
        CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(1);
        assertEq(catInfo.name, "Lucky Cat");
        assertTrue(catInfo.mintedAt > 0);

        // 验证用户小猫列表
        uint256[] memory userCats = catNFT.getUserCats(user1);
        assertEq(userCats.length, 1);
        assertEq(userCats[0], 1);

        vm.stopPrank();
    }

    function testDrawCatNFTInsufficientFee() public {
        vm.startPrank(user1);

        vm.expectRevert("Insufficient draw fee");
        catNFT.drawCatNFT{value: 0.05 ether}("Lucky Cat");

        vm.stopPrank();
    }

    function testDrawCatNFTEmptyName() public {
        vm.startPrank(user1);

        vm.expectRevert("Cat name cannot be empty");
        catNFT.drawCatNFT{value: DRAW_FEE}("");

        vm.stopPrank();
    }

    function testDrawCatNFTDuplicateName() public {
        vm.startPrank(user1);

        // 第一次抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        // 第二次使用相同名称
        vm.expectRevert("Cat name already used");
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        vm.stopPrank();
    }

    function testDrawCatNFTMaxCatsLimit() public {
        vm.startPrank(user1);

        // 抽100次卡
        for (uint256 i = 0; i < 100; i++) {
            string memory catName = string(
                abi.encodePacked("Cat ", vm.toString(i))
            );
            catNFT.drawCatNFT{value: DRAW_FEE}(catName);
        }

        // 第101次应该失败
        vm.expectRevert("Too many cats");
        catNFT.drawCatNFT{value: DRAW_FEE}("Cat 100");

        vm.stopPrank();
    }

    function testRarityDistribution() public {
        vm.startPrank(user1);

        uint256 rCount = 0;
        uint256 srCount = 0;
        uint256 ssrCount = 0;
        uint256 urCount = 0;

        // 抽100次卡统计稀有度分布
        for (uint256 i = 0; i < 100; i++) {
            string memory catName = string(
                abi.encodePacked("Cat ", vm.toString(i))
            );
            catNFT.drawCatNFT{value: DRAW_FEE}(catName);

            CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(i + 1);
            if (catInfo.rarity == CatNFT.CatRarity.R) rCount++;
            else if (catInfo.rarity == CatNFT.CatRarity.SR) srCount++;
            else if (catInfo.rarity == CatNFT.CatRarity.SSR) ssrCount++;
            else if (catInfo.rarity == CatNFT.CatRarity.UR) urCount++;
        }

        // 验证稀有度统计
        (
            uint256 actualR,
            uint256 actualSR,
            uint256 actualSSR,
            uint256 actualUR
        ) = catNFT.getRarityCounts();
        assertEq(actualR, rCount);
        assertEq(actualSR, srCount);
        assertEq(actualSSR, ssrCount);
        assertEq(actualUR, urCount);

        vm.stopPrank();
    }

    function testRainbowCatUniqueness() public {
        vm.startPrank(user1);

        bool rainbowCatFound = false;
        uint256 rainbowCatTokenId = 0;

        // 抽卡直到找到彩虹猫
        for (uint256 i = 0; i < 1000; i++) {
            string memory catName = string(
                abi.encodePacked("Cat ", vm.toString(i))
            );
            catNFT.drawCatNFT{value: DRAW_FEE}(catName);

            CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(i + 1);
            if (catInfo.rarity == CatNFT.CatRarity.UR) {
                rainbowCatFound = true;
                rainbowCatTokenId = i + 1;
                break;
            }
        }

        assertTrue(rainbowCatFound, "Rainbow cat should be found");
        assertTrue(
            catNFT.isRainbowCatMinted(),
            "Rainbow cat should be marked as minted"
        );
        assertEq(catNFT.getRainbowCatTokenId(), rainbowCatTokenId);

        // 继续抽卡，应该不会再出现UR
        for (uint256 i = 1000; i < 1100; i++) {
            string memory catName = string(
                abi.encodePacked("Cat ", vm.toString(i))
            );
            catNFT.drawCatNFT{value: DRAW_FEE}(catName);

            CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(i + 1);
            assertTrue(
                catInfo.rarity != CatNFT.CatRarity.UR,
                "Should not get UR after rainbow cat is minted"
            );
        }

        vm.stopPrank();
    }

    function testColorDistribution() public {
        vm.startPrank(user1);

        uint256 blackCount = 0;
        uint256 greenCount = 0;
        uint256 redCount = 0;
        uint256 orangeCount = 0;
        uint256 purpleCount = 0;
        uint256 blueCount = 0;
        uint256 rainbowCount = 0;

        // 抽100次卡统计颜色分布
        for (uint256 i = 0; i < 100; i++) {
            string memory catName = string(
                abi.encodePacked("Cat ", vm.toString(i))
            );
            catNFT.drawCatNFT{value: DRAW_FEE}(catName);

            CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(i + 1);
            if (keccak256(bytes(catInfo.color)) == keccak256(bytes("black")))
                blackCount++;
            else if (
                keccak256(bytes(catInfo.color)) == keccak256(bytes("green"))
            ) greenCount++;
            else if (keccak256(bytes(catInfo.color)) == keccak256(bytes("red")))
                redCount++;
            else if (
                keccak256(bytes(catInfo.color)) == keccak256(bytes("orange"))
            ) orangeCount++;
            else if (
                keccak256(bytes(catInfo.color)) == keccak256(bytes("purple"))
            ) purpleCount++;
            else if (
                keccak256(bytes(catInfo.color)) == keccak256(bytes("blue"))
            ) blueCount++;
            else if (
                keccak256(bytes(catInfo.color)) == keccak256(bytes("rainbow"))
            ) rainbowCount++;
        }

        // 验证颜色分布合理性
        assertTrue(blackCount > 0, "Should have black cats");
        assertTrue(
            greenCount + redCount + orangeCount > 0,
            "Should have SR cats"
        );
        assertTrue(purpleCount + blueCount > 0, "Should have SSR cats");
        assertTrue(rainbowCount <= 1, "Should have at most one rainbow cat");

        vm.stopPrank();
    }

    function testTransferCatNFT() public {
        vm.startPrank(user1);

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");
        uint256 tokenId = 1;

        vm.stopPrank();

        vm.startPrank(user1);

        // 转移给user2
        catNFT.transferCatNFT(tokenId, user2);

        // 验证所有权转移
        assertEq(catNFT.ownerOf(tokenId), user2);

        // 验证用户小猫列表更新
        uint256[] memory user1Cats = catNFT.getUserCats(user1);
        uint256[] memory user2Cats = catNFT.getUserCats(user2);

        assertEq(user1Cats.length, 0);
        assertEq(user2Cats.length, 1);
        assertEq(user2Cats[0], tokenId);

        vm.stopPrank();
    }

    function testTransferCatNFTNotOwner() public {
        vm.startPrank(user1);

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");
        uint256 tokenId = 1;

        vm.stopPrank();

        vm.startPrank(user2);

        // user2尝试转移user1的猫
        vm.expectRevert("Not the owner");
        catNFT.transferCatNFT(tokenId, user3);

        vm.stopPrank();
    }

    function testTransferCatNFTInvalidRecipient() public {
        vm.startPrank(user1);

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");
        uint256 tokenId = 1;

        // 转移给零地址
        vm.expectRevert("Invalid recipient");
        catNFT.transferCatNFT(tokenId, address(0));

        vm.stopPrank();
    }

    function testTransferCatNFTNonExistent() public {
        vm.startPrank(user1);

        // 尝试转移不存在的token
        vm.expectRevert("Cat NFT does not exist");
        catNFT.transferCatNFT(999, user2);

        vm.stopPrank();
    }

    function testGetRainbowCatTokenIdBeforeMinted() public {
        vm.expectRevert("Rainbow cat not minted yet");
        catNFT.getRainbowCatTokenId();
    }

    function testIsColorUsed() public {
        vm.startPrank(user1);

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(1);

        // 验证颜色已被使用
        assertTrue(catNFT.isColorUsed(catInfo.color));

        // 验证未使用的颜色
        assertFalse(catNFT.isColorUsed("nonexistent"));

        vm.stopPrank();
    }

    function testIsNameUsed() public {
        vm.startPrank(user1);

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        // 验证名称已被使用
        assertTrue(catNFT.isNameUsed("Lucky Cat"));

        // 验证未使用的名称
        assertFalse(catNFT.isNameUsed("Unused Cat"));

        vm.stopPrank();
    }

    function testSetDrawFee() public {
        uint256 newFee = 0.2 ether;

        catNFT.setDrawFee(newFee);
        assertEq(catNFT.drawFee(), newFee);
    }

    function testSetDrawFeeNotOwner() public {
        vm.startPrank(user1);

        vm.expectRevert();
        catNFT.setDrawFee(0.2 ether);

        vm.stopPrank();
    }

    function testWithdraw() public {
        vm.startPrank(user1);

        // 抽卡产生费用
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        vm.stopPrank();

        uint256 initialBalance = owner.balance;

        // 提取费用
        catNFT.withdraw();

        assertEq(owner.balance, initialBalance + DRAW_FEE);
    }

    function testWithdrawNotOwner() public {
        vm.startPrank(user1);

        vm.expectRevert();
        catNFT.withdraw();

        vm.stopPrank();
    }

    function testEvents() public {
        vm.startPrank(user1);

        // 监听事件
        vm.expectEmit(true, true, true, true);
        emit CatNFTMinted(
            1,
            "Lucky Cat",
            CatNFT.CatRarity.R,
            "black",
            user1,
            block.timestamp
        );

        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");

        vm.stopPrank();
    }

    function testRainbowCatEvent() public {
        vm.startPrank(user1);

        // 抽卡直到找到彩虹猫
        for (uint256 i = 0; i < 1000; i++) {
            string memory catName = string(
                abi.encodePacked("Cat ", vm.toString(i))
            );
            catNFT.drawCatNFT{value: DRAW_FEE}(catName);

            CatNFT.CatInfo memory catInfo = catNFT.getCatInfo(i + 1);
            if (catInfo.rarity == CatNFT.CatRarity.UR) {
                // 验证彩虹猫事件
                vm.expectEmit(true, true, true, true);
                emit RainbowCatFound(i + 1, catName, user1, block.timestamp);
                break;
            }
        }

        vm.stopPrank();
    }

    function testMultipleUsers() public {
        // user1抽卡
        vm.startPrank(user1);
        catNFT.drawCatNFT{value: DRAW_FEE}("User1 Cat");
        vm.stopPrank();

        // user2抽卡
        vm.startPrank(user2);
        catNFT.drawCatNFT{value: DRAW_FEE}("User2 Cat");
        vm.stopPrank();

        // user3抽卡
        vm.startPrank(user3);
        catNFT.drawCatNFT{value: DRAW_FEE}("User3 Cat");
        vm.stopPrank();

        // 验证各自的小猫
        assertEq(catNFT.ownerOf(1), user1);
        assertEq(catNFT.ownerOf(2), user2);
        assertEq(catNFT.ownerOf(3), user3);

        // 验证用户小猫列表
        uint256[] memory user1Cats = catNFT.getUserCats(user1);
        uint256[] memory user2Cats = catNFT.getUserCats(user2);
        uint256[] memory user3Cats = catNFT.getUserCats(user3);

        assertEq(user1Cats.length, 1);
        assertEq(user2Cats.length, 1);
        assertEq(user3Cats.length, 1);
        assertEq(user1Cats[0], 1);
        assertEq(user2Cats[0], 2);
        assertEq(user3Cats[0], 3);
    }

    function testERC721Compatibility() public {
        vm.startPrank(user1);

        // 抽卡
        catNFT.drawCatNFT{value: DRAW_FEE}("Lucky Cat");
        uint256 tokenId = 1;

        // 测试ERC721标准函数
        assertEq(catNFT.ownerOf(tokenId), user1);
        assertEq(catNFT.balanceOf(user1), 1);

        // 测试tokenURI（应该返回空字符串，因为我们没有设置）
        assertEq(catNFT.tokenURI(tokenId), "");

        vm.stopPrank();
    }
}
