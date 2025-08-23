"use client";
import { useState } from 'react';
import { NfcApi } from '@/lib/api';
import type { CatNFT } from '@/types/nfc';

export default function DrawWithTicketsForm({ onDrawn }: { onDrawn?: (cat: CatNFT) => void }) {
    const [nfcUid, setNfcUid] = useState('');
    const [catName, setCatName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await NfcApi.drawWithTickets({ nfcUid, catName });
            onDrawn?.(res as CatNFT);
        } catch (err: any) {
            setError(err?.message || '抽卡失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label className="block text-sm">NFC UID</label>
                <input className="border rounded px-2 py-1 w-full" value={nfcUid} onChange={(e) => setNfcUid(e.target.value)} placeholder="04:aa:bb:..." required />
            </div>
            <div>
                <label className="block text-sm">猫咪名</label>
                <input className="border rounded px-2 py-1 w-full" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Lucky Cat" required />
            </div>
            <button disabled={loading} className="bg-black text-white px-3 py-1 rounded disabled:opacity-60">{loading ? '抽卡中...' : '用券抽卡'}</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
    );
}
