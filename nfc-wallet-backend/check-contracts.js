const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function checkContractDeployments() {
    try {
        console.log('🔍 检查合约部署状态...');

        const rpcUrl = process.env.INJECTIVE_RPC_URL || "https://k8s.testnet.json-rpc.injective.network/";
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        const contracts = {
            'CAT_NFT_ADDRESS': process.env.CAT_NFT_ADDRESS || "0x80983862cb4A43Cdfc4bEe9558f0c285130Df0F5",
            'DOMAIN_REGISTRY_ADDRESS': process.env.DOMAIN_REGISTRY_ADDRESS || "0x598AAe7ab70e3afe0669b17Ba856993F3080C4a7",
            'NFC_REGISTRY_ADDRESS': process.env.NFC_REGISTRY_ADDRESS || ""
        };

        for (const [name, address] of Object.entries(contracts)) {
            if (!address) {
                console.log(`⚠️ ${name}: 未配置地址`);
                continue;
            }

            console.log(`\n📋 检查 ${name}: ${address}`);

            // 检查合约代码
            const code = await provider.getCode(address);
            if (code === '0x') {
                console.log(`❌ ${name}: 合约未部署或地址错误`);
            } else {
                console.log(`✅ ${name}: 合约已部署 (${code.length} 字节)`);

                // 尝试调用一些基本方法
                try {
                    const contract = new ethers.Contract(address, ['function name() view returns (string)', 'function symbol() view returns (string)'], provider);

                    try {
                        const contractName = await contract.name();
                        console.log(`  📝 合约名称: ${contractName}`);
                    } catch (error) {
                        console.log(`  ⚠️ 无法获取合约名称: ${error.message}`);
                    }

                    try {
                        const symbol = await contract.symbol();
                        console.log(`  🏷️ 合约符号: ${symbol}`);
                    } catch (error) {
                        console.log(`  ⚠️ 无法获取合约符号: ${error.message}`);
                    }
                } catch (error) {
                    console.log(`  ⚠️ 合约接口调用失败: ${error.message}`);
                }
            }
        }

        // 检查主账户余额
        console.log('\n💰 检查主账户余额...');
        const masterPrivateKey = process.env.CONTRACT_PRIVATE_KEY || "adbac67afad51760f4049e3ce2c32fcf0cb630f62f9f011290bb87a975171f67";
        const masterWallet = new ethers.Wallet(masterPrivateKey, provider);
        const masterBalance = await provider.getBalance(masterWallet.address);
        const balanceFormatted = ethers.formatEther(masterBalance);

        console.log(`主账户地址: ${masterWallet.address}`);
        console.log(`主账户余额: ${balanceFormatted} INJ`);

        if (parseFloat(balanceFormatted) < 0.1) {
            console.log('⚠️ 主账户余额不足！');
        } else {
            console.log('✅ 主账户余额充足');
        }

    } catch (error) {
        console.error('❌ 检查失败:', error.message);
    }
}

checkContractDeployments();
