// Mark a user's initialFunded=true by NFC UID and record a transaction
// Usage: node scripts/mark-initial-funded.js <nfc_uid> <tx_hash> [amount]

const { PrismaClient } = require('@prisma/client');
const { PrivateKey } = require('@injectivelabs/sdk-ts');

async function main() {
    const uid = process.argv[2];
    const txHashArg = process.argv[3];
    const amount = process.argv[4] || '0.1';
    if (!uid) {
        console.error('Usage: node scripts/mark-initial-funded.js <nfc_uid> <tx_hash> [amount]');
        process.exit(1);
    }

    const prisma = new PrismaClient();
    try {
        const card = await prisma.nFCCard.findUnique({ where: { uid }, include: { user: true } });
        if (!card) {
            throw new Error(`NFCCard not found for uid: ${uid}`);
        }

        // compute master address if available
        let fromAddress = process.env.MASTER_WALLET_ADDRESS || null;
        const pk = process.env.CONTRACT_PRIVATE_KEY;
        if (pk) {
            try {
                const injAddr = PrivateKey.fromPrivateKey(pk).toPublicKey().toAddress().toBech32();
                fromAddress = fromAddress || injAddr;
            } catch { }
        }

        // update user
        await prisma.user.update({
            where: { id: card.user.id },
            data: { initialFunded: true },
        });

        // record transaction (optional but recommended)
        if (txHashArg) {
            await prisma.transaction.create({
                data: {
                    txHash: txHashArg.startsWith('0x') ? txHashArg : `0x${txHashArg}`,
                    userId: card.user.id,
                    type: 'INITIAL_FUND',
                    amount: amount,
                    tokenSymbol: 'INJ',
                    fromAddress: fromAddress,
                    toAddress: card.user.address,
                    status: 'CONFIRMED',
                    memo: 'Manual initial fund mark',
                    rawTx: { note: 'manually marked funded' },
                },
            });
        }

        console.log(`✅ Marked initialFunded=true for uid=${uid}, user=${card.user.address}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
});

