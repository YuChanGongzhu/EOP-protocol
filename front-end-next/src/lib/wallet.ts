import { ethers } from 'ethers';

export interface WalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  mnemonic?: string;
}

export interface StoredWalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  mnemonic?: string;
  createdAt: number;
}

// 创建新钱包
export function createWallet(): WalletData {
  const wallet = ethers.Wallet.createRandom();
  const publicKey = ethers.SigningKey.computePublicKey(wallet.privateKey);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: publicKey,
    mnemonic: wallet.mnemonic?.phrase
  };
}

// 从私钥恢复钱包
export function restoreWalletFromPrivateKey(privateKey: string): WalletData {
  const wallet = new ethers.Wallet(privateKey);
  const publicKey = ethers.SigningKey.computePublicKey(privateKey);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: publicKey
  };
}

// 从助记词恢复钱包
export function restoreWalletFromMnemonic(mnemonic: string): WalletData {
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  const publicKey = ethers.SigningKey.computePublicKey(wallet.privateKey);
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    publicKey: publicKey,
    mnemonic: wallet.mnemonic?.phrase
  };
}

// 存储钱包到 localStorage (加密存储建议)
export function storeWallet(walletData: WalletData): boolean {
  try {
    const storedData: StoredWalletData = {
      ...walletData,
      createdAt: Date.now()
    };
    
    // 注意：在生产环境中，私钥应该加密存储
    localStorage.setItem('traditionalWallet', JSON.stringify(storedData));
    localStorage.setItem('walletAddress', walletData.address);
    localStorage.setItem('walletType', 'traditional');
    
    return true;
  } catch (error) {
    console.error('存储钱包失败:', error);
    return false;
  }
}

// 从 localStorage 获取钱包
export function getStoredWallet(): StoredWalletData | null {
  try {
    const stored = localStorage.getItem('traditionalWallet');
    if (!stored) return null;
    
    return JSON.parse(stored) as StoredWalletData;
  } catch (error) {
    console.error('获取存储的钱包失败:', error);
    return null;
  }
}

// 检查是否已有传统钱包
export function hasTraditionalWallet(): boolean {
  return localStorage.getItem('traditionalWallet') !== null;
}

// 清除钱包数据
export function clearWallet(): void {
  localStorage.removeItem('traditionalWallet');
  localStorage.removeItem('walletAddress');
  localStorage.removeItem('walletType');
}

// 验证私钥格式
export function isValidPrivateKey(privateKey: string): boolean {
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
}

// 验证助记词格式
export function isValidMnemonic(mnemonic: string): boolean {
  try {
    ethers.Wallet.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}

// 获取钱包余额 (需要provider)
export async function getWalletBalance(address: string, providerUrl?: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl || 'https://ethereum-holesky-rpc.publicnode.com');
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('获取余额失败:', error);
    return '0';
  }
}
