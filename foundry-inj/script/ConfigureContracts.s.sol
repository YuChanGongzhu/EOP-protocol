// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/NFCWalletRegistry.sol";

contract ConfigureContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 合约地址
        address nfcRegistryAddress = 0xF7Bfd108C4C78A334b0cBdE3b2f1D2B9a2753d15;
        address domainNFTAddress = 0x210CDeCDc6f0B46802C5d3a0F2F9d8d30D4e67FD;
        address catNFTAddress = 0x15160C8d6748cF9cF8AD5fB0C006FA8E777329D1;

        NFCWalletRegistry nfcRegistry = NFCWalletRegistry(nfcRegistryAddress);

        // 配置合约连接
        nfcRegistry.setCatNFTContract(catNFTAddress);
        console.log("CatNFT contract configured in NFCRegistry");

        nfcRegistry.setDomainNFTContract(domainNFTAddress);
        console.log("DomainNFT contract configured in NFCRegistry");

        console.log("=== Contract Configuration Complete ===");
        console.log("NFCWalletRegistry:", nfcRegistryAddress);
        console.log("INJDomainNFT:", domainNFTAddress);
        console.log("CatNFT:", catNFTAddress);

        vm.stopBroadcast();
    }
}
