import { API_BASE_URL } from '@/lib/config';

export type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
        cache: 'no-store',
        ...init,
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
}

export const NfcApi = {
    register: (body: { uid: string; nickname?: string }) =>
        request('/api/nfc/register', { method: 'POST', body: JSON.stringify(body) }),
    wallet: (uid: string) => request(`/api/nfc/wallet/${uid}`),
    stats: () => request('/api/nfc/stats'),
    balance: (address: string) => request(`/api/nfc/balance/${address}`),
    domainCheck: (domainPrefix: string) => request(`/api/nfc/domain/check?domainPrefix=${encodeURIComponent(domainPrefix)}`),
    domainRegister: (body: { uid: string; domainPrefix: string }) =>
        request('/api/nfc/domain/register', { method: 'POST', body: JSON.stringify(body) }),
    socialInteraction: (body: { myNFC: string; otherNFC: string }) =>
        request('/api/nfc/social-interaction', { method: 'POST', body: JSON.stringify(body) }),
    drawWithTickets: (body: { nfcUid: string; catName: string }) =>
        request('/api/nfc/draw-cat-with-tickets', { method: 'POST', body: JSON.stringify(body) }),
    drawStats: (nfcUID: string) => request(`/api/nfc/draw-stats/${nfcUID}`),
    interactedNFCs: (nfcUID: string) => request(`/api/nfc/interacted-nfcs/${nfcUID}`),
};

export const UserApi = {
    profile: (uid: string) => request(`/api/user/profile/${uid}`),
    updateDomain: (body: { uid: string; domainPrefix: string }) =>
        request('/api/user/domain', { method: 'PUT', body: JSON.stringify(body) }),
    checkDomain: (domainPrefix: string) => request(`/api/user/check-domain/${encodeURIComponent(domainPrefix)}`),
    removeDomain: (uid: string) => request(`/api/user/domain/${uid}`, { method: 'DELETE' }),
    list: (page = 1, limit = 20) => request(`/api/user/list?page=${page}&limit=${limit}`),
};

export const ContractApi = {
    status: () => request('/api/contract/status'),
};
