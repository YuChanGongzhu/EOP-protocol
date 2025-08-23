// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/NFCWalletRegistry.sol";
import "../src/INJDomainNFT.sol";
import "../src/CatNFT_SocialDraw.sol";

contract DeployContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy NFCWalletRegistry first (no dependencies)
        NFCWalletRegistry nfcRegistry = new NFCWalletRegistry();
        console.log("NFCWalletRegistry deployed at:", address(nfcRegistry));

        // 2. Deploy INJDomainNFT (needs NFCRegistry address)
        INJDomainNFT domainNFT = new INJDomainNFT(address(nfcRegistry));
        console.log("INJDomainNFT deployed at:", address(domainNFT));

        // 3. Deploy CatNFT (requires NFCWalletRegistry address)
        CatNFT catNFT = new CatNFT(address(nfcRegistry));
        console.log("CatNFT deployed at:", address(catNFT));

        // 4. Configure contract connections
        nfcRegistry.setCatNFTContract(address(catNFT));
        nfcRegistry.setDomainNFTContract(address(domainNFT));
        console.log("Contract connections configured");

        console.log("=== Deployment Summary ===");
        console.log("NFCWalletRegistry:", address(nfcRegistry));
        console.log("INJDomainNFT:", address(domainNFT));
        console.log("CatNFT:", address(catNFT));

        vm.stopBroadcast();
    }
}
