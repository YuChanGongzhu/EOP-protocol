"use client";
import { useState } from 'react';
import { NfcApi } from '@/lib/api';
import type { SocialInteractionResp } from '@/types/nfc';

export default function SocialInteractionForm({ onSuccess }: { onSuccess?: (res: SocialInteractionResp) => void }) {
    const [myNFC, setMyNFC] = useState('');
    const [otherNFC, setOtherNFC] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await NfcApi.socialInteraction({ myNFC, otherNFC });
            onSuccess?.({
                transactionHash: (res as any)?.transactionHash || '',
                rewardTickets: 1,
                totalTickets: 1,
                message: 'ok',
            } as SocialInteractionResp);
        } catch (err: any) {
            setError(err?.message || '互动失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label className="block text-sm">我的 NFC UID</label>
                <input className="border rounded px-2 py-1 w-full" value={myNFC} onChange={(e) => setMyNFC(e.target.value)} placeholder="04:aa:bb:..." required />
            </div>
            <div>
                <label className="block text-sm">对方 NFC UID</label>
                <input className="border rounded px-2 py-1 w-full" value={otherNFC} onChange={(e) => setOtherNFC(e.target.value)} placeholder="04:11:22:..." required />
            </div>
            <button disabled={loading} className="bg-black text-white px-3 py-1 rounded disabled:opacity-60">{loading ? '提交中...' : '社交互动'}</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
    );
}
