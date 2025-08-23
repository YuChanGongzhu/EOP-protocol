import { ethers } from 'ethers';
import NFC_ABI from '@/abi/NFCWalletRegistry.json';
import CAT_ABI from '@/abi/CatNFT_SocialDraw.json';
import ADDR from '@/addresses.sepolia.json';

export const SEPOLIA_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.gateway.tenderly.co';
export const CHAIN_ID = 11155111;

// 从 broadcast 读取已部署地址
export const ADDRESSES = {
    NFCRegistry: (ADDR as any).NFCWalletRegistry as string,
    CatNFT: (ADDR as any).CatNFT as string,
} as const;

export function getProvider() {
    return new ethers.JsonRpcProvider(SEPOLIA_RPC, CHAIN_ID);
}

export function getSigner(): ethers.Signer | null {
    if (typeof window === 'undefined') return null;
    // 使用本地生成的钱包私钥（演示用途），生产环境应接入钱包或 Passkey 钱包
    const stored = localStorage.getItem('traditionalWallet');
    if (!stored) return null;
    try {
        const obj = JSON.parse(stored) as { privateKey: string };
        const provider = getProvider();
        return new ethers.Wallet(obj.privateKey, provider);
    } catch {
        return null;
    }
}

export function getSponsorSigner(): ethers.Signer | null {
    if (typeof window === 'undefined') return null;
    const sponsorPk = process.env.NEXT_PUBLIC_SPONSOR_PK || (window as any).NEXT_PUBLIC_SPONSOR_PK || '';
    if (!sponsorPk) return null;
    try {
        const provider = getProvider();
        return new ethers.Wallet(sponsorPk as string, provider);
    } catch {
        return null;
    }
}

export function getNFCContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
    const p = signerOrProvider || getProvider();
    return new ethers.Contract(ADDRESSES.NFCRegistry, NFC_ABI as any, p);
}

export function getCatContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
    const p = signerOrProvider || getProvider();
    return new ethers.Contract(ADDRESSES.CatNFT, CAT_ABI as any, p);
}

export async function ensureSigner() {
    const signer = getSigner();
    if (!signer) throw new Error('No signer available');
    return signer;
}


