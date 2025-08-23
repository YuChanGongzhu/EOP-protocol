// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "../src/CatNFT_SocialDraw.sol";

contract AuthorizeBackendScript is Script {
    // 合约地址
    address constant CAT_NFT_ADDRESS =
        0x10fd6cC8d9272caC010224A93e1FA00Ce291E6D8;

    // 后端钱包地址（需要授权的地址）
    address constant BACKEND_ADDRESS =
        0x1dd50ffF32Ecde6694e56C5bBfE902Fcbc8d2441;

    function run() external {
        // 读取部署者私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // 开始广播交易
        vm.startBroadcast(deployerPrivateKey);

        // 获取合约实例
        CatNFT catNFT = CatNFT(CAT_NFT_ADDRESS);

        // 授权后端地址作为操作者
        console.log("Authorizing backend address:", BACKEND_ADDRESS);
        catNFT.setAuthorizedOperator(BACKEND_ADDRESS, true);

        console.log("Backend address authorized successfully!");

        vm.stopBroadcast();
    }
}
