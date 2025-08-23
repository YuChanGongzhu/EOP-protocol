import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';
import * as crypto from 'crypto';
import { Wallet } from 'ethers';
import { PrivateKey } from '@injectivelabs/sdk-ts';

@Injectable()
export class CryptoService {
    private readonly encryptionKey: string;

    constructor(private configService: ConfigService) {
        this.encryptionKey = this.configService.get<string>('AES_ENCRYPTION_KEY');
        if (!this.encryptionKey || this.encryptionKey.length !== 64) {
            throw new Error('AES_ENCRYPTION_KEY 必须是64位十六进制字符串 (32字节)');
        }
    }

    /**
     * 生成新的钱包（兼容方法名）
     */
    async generateWallet(): Promise<{
        address: string;
        privateKey: string;
        ethAddress: string;
        publicKey: string;
    }> {
        return this.generateInjectiveWallet();
    }

    /**
     * 加密数据（兼容方法名）
     */
    async encryptData(data: string): Promise<string> {
        return this.encrypt(data);
    }

    /**
     * 使用AES-256-GCM加密私钥
     * @param privateKey 以太坊私钥
     * @returns 格式: iv:tag:encrypted (十六进制)
     */
    encrypt(privateKey: string): string {
        try {
            // 生成随机初始向量 (12字节用于GCM)
            const iv = crypto.randomBytes(12);

            // 创建加密器
            const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);

            // 加密
            let encrypted = cipher.update(privateKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // 获取认证标签
            const tag = cipher.getAuthTag();

            // 返回格式: iv:tag:encrypted
            return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
        } catch (error) {
            throw new Error(`私钥加密失败: ${error.message}`);
        }
    }

    /**
     * 解密私钥
     * @param encryptedData 加密的数据 (格式: iv:tag:encrypted)
     * @returns 解密后的私钥
     */
    decrypt(encryptedData: string): string {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 3) {
                throw new Error('加密数据格式无效');
            }

            const [ivHex, tagHex, encryptedHex] = parts;

            // 转换为Buffer
            const iv = Buffer.from(ivHex, 'hex');
            const tag = Buffer.from(tagHex, 'hex');

            // 创建解密器
            const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
            decipher.setAuthTag(tag);

            // 解密
            let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error(`私钥解密失败: ${error.message}`);
        }
    }

    /**
     * 生成安全的API密钥哈希
     * @param apiKey 原始API密钥
     * @returns SHA-256哈希值
     */
    hashApiKey(apiKey: string): string {
        return CryptoJS.SHA256(apiKey).toString(CryptoJS.enc.Hex);
    }

    /**
     * 生成随机API密钥
     * @param prefix 密钥前缀
     * @returns 新的API密钥
     */
    generateApiKey(prefix: string = 'nfc_'): string {
        const randomBytes = crypto.randomBytes(32);
        return `${prefix}${randomBytes.toString('hex')}`;
    }

    /**
     * 生成Injective钱包
     */
    generateInjectiveWallet(): {
        privateKey: string;
        address: string;
        ethAddress: string;
        publicKey: string;
    } {
        try {
            // 生成以太坊兼容的私钥
            const ethWallet = Wallet.createRandom();

            // 使用Injective SDK处理地址转换
            const privateKeyObj = PrivateKey.fromPrivateKey(ethWallet.privateKey);
            const publicKey = privateKeyObj.toPublicKey();
            const address = publicKey.toAddress();

            return {
                privateKey: ethWallet.privateKey,
                address: address.toBech32(), // Injective地址 (inj...)
                ethAddress: ethWallet.address, // 以太坊格式地址
                publicKey: publicKey.toBase64()
            };
        } catch (error) {
            console.error('Error generating Injective wallet:', error);
            throw new Error('Failed to generate Injective wallet');
        }
    }

    /**
     * 验证私钥格式
     * @param privateKey 私钥字符串
     * @returns 是否为有效的以太坊私钥
     */
    validatePrivateKey(privateKey: string): boolean {
        // 以太坊私钥应该是64字符的十六进制字符串（不包含0x前缀）
        // 或66字符的十六进制字符串（包含0x前缀）
        const cleanKey = privateKey.replace(/^0x/, '');
        return /^[a-fA-F0-9]{64}$/.test(cleanKey);
    }
} 