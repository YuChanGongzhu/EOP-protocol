"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasExistingPasskey, getPasskeySignature } from '@/lib/passkey';
import { NfcApi } from '@/lib/api';
import { storeWallet } from '@/lib/wallet';
import { Logger } from '@/lib/logger';

export default function PasskeyCheckPage() {
    const router = useRouter();
    const [message, setMessage] = useState('正在检测通行密钥...');
    const inFlightRef = useRef(false);

    useEffect(() => {
        const run = async () => {
            if (inFlightRef.current) return;
            inFlightRef.current = true;
            try {
                // 能力检测
                if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
                    router.replace('/passkey-create');
                    return;
                }
                const platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                if (!platformAvailable) {
                    router.replace('/passkey-create');
                    return;
                }

                setMessage('尝试使用现有通行密钥登录...');
                Logger.info('Passkey/Login: start');
                const publicKey: PublicKeyCredentialRequestOptions = {
                    challenge: new TextEncoder().encode(crypto.randomUUID()),
                    timeout: 60000,
                    userVerification: 'required'
                };

                try {
                    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
                    if (credential) {
                        const passkeyId = credential.id;
                        Logger.info('Passkey/Login: credential obtained', { passkeyId });
                        // 若该 Passkey 已有映射，切换为对应钱包；否则新建并关联
                        const raw = localStorage.getItem('passkeyWallets');
                        const map = raw ? JSON.parse(raw) : {};
                        const mapped = map[passkeyId];
                        if (mapped) {
                            Logger.info('Passkey/Login: map found, switching wallet', { address: mapped.address });
                            storeWallet({
                                address: mapped.address,
                                privateKey: mapped.privateKey,
                                publicKey: mapped.publicKey,
                                mnemonic: mapped.mnemonic,
                            });
                            localStorage.setItem('activePasskeyId', passkeyId);
                        } else {
                            const created = await NfcApi.createWallet();
                            Logger.info('Passkey/Login: map missing, created new wallet', { address: created.address });
                            map[passkeyId] = created;
                            localStorage.setItem('passkeyWallets', JSON.stringify(map));
                            localStorage.setItem('activePasskeyId', passkeyId);
                        }
                        Logger.info('Passkey/Login: success, redirect /dashboard');
                        router.replace('/dashboard');
                        return;
                    }
                    Logger.warn('Passkey/Login: no credential, goto create');
                    router.replace('/passkey-create');
                } catch {
                    Logger.warn('Passkey/Login: navigator.credentials.get failed, goto create');
                    router.replace('/passkey-create');
                }
            } finally {
                inFlightRef.current = false;
            }
        };
        run();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-white text-black">
            <div className="flex flex-col items-center gap-3">
                <svg className="w-12 h-12 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.2"></circle>
                    <path d="M22 12a10 10 0 0 1-10 10" />
                </svg>
                <p className="text-sm text-gray-600">{message}</p>
            </div>
        </div>
    );
}


