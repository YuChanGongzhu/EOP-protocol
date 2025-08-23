"use client";
import { useState } from 'react';
import { NfcApi } from '@/lib/api';
import type { WalletResponse } from '@/types/nfc';

export default function NfcRegisterForm({ onRegistered }: { onRegistered?: (res: WalletResponse) => void }) {
    const [uid, setUid] = useState('');
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await NfcApi.register({ uid, nickname: nickname || undefined });
            onRegistered?.(res as WalletResponse);
        } catch (err: any) {
            setError(err?.message || '注册失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label className="block text-sm">NFC UID</label>
                <input className="border rounded px-2 py-1 w-full" value={uid} onChange={(e) => setUid(e.target.value)} placeholder="04:aa:bb:..." required />
            </div>
            <div>
                <label className="block text-sm">昵称（可选）</label>
                <input className="border rounded px-2 py-1 w-full" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="我的主卡" />
            </div>
            <button disabled={loading} className="bg-black text-white px-3 py-1 rounded disabled:opacity-60">{loading ? '注册中...' : '注册 NFC'}</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
    );
}
