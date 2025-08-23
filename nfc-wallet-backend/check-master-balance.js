const { ethers } = require('ethers');
const {
    PrivateKey,
    ChainRestBankApi,
    getNetworkEndpoints
} = require('@injectivelabs/sdk-ts');
const { BigNumberInWei } = require('@injectivelabs/utils');
const { Network } = require('@injectivelabs/networks');

async function checkMasterWalletBalance() {
    try {
        console.log('🔍 检查主账户余额...');

        const masterPrivateKey = process.env.CONTRACT_PRIVATE_KEY || "adbac67afad51760f4049e3ce2c32fcf0cb630f62f9f011290bb87a975171f67";
        const network = Network.TestnetSentry;
        const endpoints = getNetworkEndpoints(network);

        // 从私钥生成地址
        const privateKeyObj = PrivateKey.fromPrivateKey(masterPrivateKey);
        const publicKey = privateKeyObj.toPublicKey();
        const address = publicKey.toAddress();
        const injectiveAddress = address.toBech32();

        console.log(`主钱包地址: ${injectiveAddress}`);

        // 获取余额
        const chainRestBankApi = new ChainRestBankApi(endpoints.rest);
        const balancesResponse = await chainRestBankApi.fetchBalances(injectiveAddress);

        // 查找 INJ 余额
        const injBalance = balancesResponse.balances.find(balance => balance.denom === 'inj');
        const balance = injBalance ? injBalance.amount : '0';

        const injBalanceFormatted = new BigNumberInWei(balance).toFixed(6);

        console.log(`主钱包余额: ${injBalanceFormatted} INJ`);

        if (parseFloat(injBalanceFormatted) < 1.0) {
            console.log('⚠️ 主钱包余额不足！需要至少 1 INJ 来发送初始资金');
        } else {
            console.log('✅ 主钱包余额充足');
        }

    } catch (error) {
        console.error('❌ 检查余额失败:', error.message);
    }
}

checkMasterWalletBalance();
