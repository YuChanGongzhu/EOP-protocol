import { ethers } from 'ethers';
import { getProvider, getNFCContract, getCatContract, ensureSigner, getSponsorSigner } from '@/lib/contracts';
import { createWallet as createLocalWallet, storeWallet as storeLocalWallet } from '@/lib/wallet';
import { Logger } from '@/lib/logger';

export const NfcApi = {
    // 创建本地以太坊钱包并存储到 localStorage（私钥明文存储仅用于演示）
    createWallet: async () => {
        const w = createLocalWallet();
        storeLocalWallet(w);
        Logger.info('Wallet/Create: stored', { address: w.address });
        return {
            address: w.address,
            privateKey: w.privateKey,
            publicKey: w.publicKey,
            mnemonic: w.mnemonic,
            createdAt: Date.now(),
        };
    },
    // 自助绑定空白卡
    register: async (body: { uid: string; nickname?: string }) => {
        const sponsor = getSponsorSigner();
        if (sponsor) {
            const nfcSponsor = getNFCContract(sponsor);
            const userSigner = await ensureSigner();
            const userAddr = await userSigner!.getAddress();
            const nonce: bigint = await nfcSponsor.getNonce(userAddr);
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
            const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
                ['address', 'string', 'address', 'string', 'uint256', 'uint256'],
                [await nfcSponsor.getAddress(), 'sponsorBindBlankCard', userAddr, body.uid, nonce, deadline]
            );
            const messageHash = ethers.keccak256(encoded);
            const signature = await userSigner!.signMessage(ethers.getBytes(messageHash));
            Logger.info('NFC/sponsorBindBlankCard: send', { uid: body.uid, user: userAddr, nonce: nonce.toString() });
            const tx = await nfcSponsor.sponsorBindBlankCard(body.uid, userAddr, deadline, nonce, signature);
            const receipt = await tx.wait();
            Logger.info('NFC/sponsorBindBlankCard: mined', { txHash: receipt?.hash });
            return { txHash: receipt?.hash } as any;
        }
        const signer = await ensureSigner();
        const nfc = getNFCContract(signer);
        Logger.info('NFC/selfBindBlankCard: send', body);
        const tx = await nfc.selfBindBlankCard(body.uid);
        const receipt = await tx.wait();
        Logger.info('NFC/selfBindBlankCard: mined', { txHash: receipt?.hash });
        return { txHash: receipt?.hash } as any;
    },
    // 查询某 NFC 绑定的钱包地址
    wallet: async (uid: string) => {
        const nfc = getNFCContract(getProvider());
        try {
            const binding = await nfc.getNFCBinding(uid);
            const addr: string = binding.walletAddress as string;
            const ok = ethers.isAddress(addr) ? addr : '';
            Logger.info('NFC/getNFCBinding: result', { uid, address: ok });
            return { address: ok } as any;
        } catch (e) {
            Logger.warn('NFC/getNFCBinding: failed', e);
            return { address: '' } as any;
        }
    },
    // 余额直接链上查
    balance: async (address: string) => {
        if (!ethers.isAddress(address)) {
            return { eth: '0', usdt: '0' } as any;
        }
        const provider = getProvider();
        const balance = await provider.getBalance(address);
        const formatted = ethers.formatEther(balance);
        Logger.info('Balance/getBalance: ok', { address, eth: formatted });
        return { eth: formatted, usdt: '0' } as any;
    },
    // 社交互动
    socialInteraction: async (body: { myNFC: string; otherNFC: string }) => {
        const signer = await ensureSigner();
        const cat = getCatContract(signer);
        Logger.info('CatNFT/socialInteraction: send', body);
        const tx = await cat.socialInteraction(body.myNFC, body.otherNFC);
        const receipt = await tx.wait();
        Logger.info('CatNFT/socialInteraction: mined', { txHash: receipt?.hash });
        return { transactionHash: receipt?.hash } as any;
    },
    // 用券抽卡
    drawWithTickets: async (body: { nfcUid: string; catName: string }) => {
        const sponsor = getSponsorSigner();
        if (sponsor) {
            const catSponsor = getCatContract(sponsor);
            const userSigner = await ensureSigner();
            const userAddr = await userSigner!.getAddress();
            const nonce: bigint = await catSponsor.nonces(userAddr);
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
            const fee = await catSponsor.drawFee();
            const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
                ['address', 'string', 'address', 'string', 'string', 'uint256', 'uint256'],
                [await catSponsor.getAddress(), 'drawCatNFTWithTickets', userAddr, body.nfcUid, body.catName, nonce, deadline]
            );
            const messageHash = ethers.keccak256(encoded);
            const signature = await userSigner!.signMessage(ethers.getBytes(messageHash));
            Logger.info('CatNFT/drawWithTicketsWithSig: send', { ...body, user: userAddr, fee: fee.toString() });
            const tx = await catSponsor.drawCatNFTWithTicketsWithSig(body.nfcUid, body.catName, userAddr, deadline, nonce, signature, { value: fee });
            const receipt = await tx.wait();
            Logger.info('CatNFT/drawWithTicketsWithSig: mined', { txHash: receipt?.hash });
            return { txHash: receipt?.hash } as any;
        }
        const signer = await ensureSigner();
        const cat = getCatContract(signer);
        const fee = await cat.drawFee();
        Logger.info('CatNFT/drawWithTickets: send', { ...body, fee: fee.toString() });
        const tx = await cat.drawCatNFTWithTickets(body.nfcUid, body.catName, { value: fee });
        const receipt = await tx.wait();
        Logger.info('CatNFT/drawWithTickets: mined', { txHash: receipt?.hash });
        return { txHash: receipt?.hash } as any;
    },
    // 统计
    drawStats: async (nfcUID: string) => {
        const cat = getCatContract(getProvider());
        const [available, used, total] = await cat.getDrawStats(nfcUID);
        const result = { availableDraws: Number(available), usedDraws: Number(used), totalDraws: Number(total) } as any;
        Logger.info('CatNFT/getDrawStats: result', { nfcUID, ...result });
        return result;
    },
    interactedNFCs: async (nfcUID: string) => {
        const cat = getCatContract(getProvider());
        const list = await cat.getInteractedNFCs(nfcUID);
        Logger.info('CatNFT/getInteractedNFCs: result', { nfcUID, count: list.length });
        return { list } as any;
    },
};

export const UserApi = {
    profile: async (_uid: string) => ({} as any),
    updateDomain: async () => ({} as any),
    checkDomain: async () => ({ available: false } as any),
    removeDomain: async () => ({} as any),
    list: async () => ({ users: [] } as any),
};

export const ContractApi = {
    status: async () => ({ ok: true }),
};
