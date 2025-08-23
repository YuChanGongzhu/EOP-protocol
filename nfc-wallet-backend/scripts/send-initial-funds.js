// Send initial INJ to a recipient using Injective SDK
// Usage: node scripts/send-initial-funds.js <inj_or_0x_address> <amount_in_inj>

const { PrivateKey, MsgSend, MsgBroadcasterWithPk } = require('@injectivelabs/sdk-ts');
const { BigNumberInBase } = require('@injectivelabs/utils');
const { Network, getNetworkEndpoints } = require('@injectivelabs/networks');
const { getInjectiveAddress } = require('@injectivelabs/sdk-ts');

async function main() {
    const toArg = process.argv[2];
    const amountArg = process.argv[3] || '0.1';
    if (!toArg) {
        console.error('Usage: node scripts/send-initial-funds.js <inj_or_0x_address> <amount_in_inj>');
        process.exit(1);
    }

    const privateKey = process.env.CONTRACT_PRIVATE_KEY;
    if (!privateKey) {
        console.error('ERROR: CONTRACT_PRIVATE_KEY not set in env');
        process.exit(1);
    }

    const network = process.env.NODE_ENV === 'production' ? Network.Mainnet : Network.TestnetSentry;
    const endpoints = getNetworkEndpoints(network);

    const normalizedTo = toArg.startsWith('inj') ? toArg : getInjectiveAddress(toArg);

    const pk = PrivateKey.fromPrivateKey(privateKey);
    const fromAddress = pk.toPublicKey().toAddress().toBech32();

    const broadcaster = new MsgBroadcasterWithPk({ privateKey, network, endpoints });

    const msg = MsgSend.fromJSON({
        amount: {
            denom: 'inj',
            amount: new BigNumberInBase(amountArg).toWei().toFixed(),
        },
        srcInjectiveAddress: fromAddress,
        dstInjectiveAddress: normalizedTo,
    });

    console.log(`Sending ${amountArg} INJ -> ${normalizedTo} from ${fromAddress}`);
    const res = await broadcaster.broadcast({ msgs: msg });
    if (res.code === 0) {
        console.log(`✅ Success: ${res.txHash}`);
    } else {
        console.error(`❌ Failed: ${res.rawLog}`);
        process.exit(1);
    }
}

main().catch((e) => {
    console.error('Unhandled error:', e.message);
    process.exit(1);
});

