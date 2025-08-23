"use client";
import { useState } from 'react';
import { NfcApi } from '@/lib/api';

interface DomainRegisterFormProps {
    onSuccess?: (domain: string) => void;
    className?: string;
}

export default function DomainRegisterForm({ onSuccess, className = '' }: DomainRegisterFormProps) {
    const [uid, setUid] = useState('');
    const [prefix, setPrefix] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isDomainAvailable, setIsDomainAvailable] = useState<boolean | null>(null);

    // 检查域名可用性
    const checkDomainAvailability = async () => {
        if (!prefix.trim()) return;
        
        setIsChecking(true);
        setMsg(null);
        setIsDomainAvailable(null);
        
        try {
            const result = await NfcApi.domainCheck(prefix.trim());
            setIsDomainAvailable(result.available);
            
            if (result.available) {
                setMsg({ text: `域名 advx-${prefix.trim()}.inj 可用`, type: 'success' });
            } else {
                setMsg({ text: `域名 advx-${prefix.trim()}.inj 已被注册`, type: 'error' });
            }
        } catch (err: any) {
            console.error('检查域名失败:', err);
            setMsg({ text: err?.message || '检查域名失败，请重试', type: 'error' });
            setIsDomainAvailable(false);
        } finally {
            setIsChecking(false);
        }
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        setLoading(true);
        try {
            const res = await NfcApi.domainRegister({ uid, domainPrefix: prefix });
            setMsg({ text: `注册成功: ${res.domain}`, type: 'success' });
            
            // 如果提供了成功回调，则调用它
            if (onSuccess) {
                onSuccess(res.domain);
            }
            
            // 清空表单
            setUid('');
            setPrefix('');
        } catch (err: any) {
            setMsg({ text: err?.message || '注册失败', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={submit} className={`space-y-4 ${className}`}>
            <div>
                <label className="block text-sm text-white/80 mb-1">NFC UID</label>
                <input 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50" 
                    value={uid} 
                    onChange={(e) => setUid(e.target.value)} 
                    placeholder="04:aa:bb:..." 
                    required 
                />
            </div>
            <div>
                <label className="block text-sm text-white/80 mb-1">域名前缀</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <span className="px-2 py-2 bg-white/10 text-white/70 text-sm">advx-</span>
                    <input 
                        className="flex-1 bg-transparent border-none px-3 py-2 text-white placeholder-white/30 focus:outline-none" 
                        value={prefix} 
                        onChange={(e) => {
                            setPrefix(e.target.value);
                            setIsDomainAvailable(null);
                        }} 
                        placeholder="alice" 
                        required 
                    />
                    <span className="px-2 py-2 bg-white/10 text-white/70 text-sm">.inj</span>
                </div>
            </div>
            
            {/* 域名检查按钮 */}
            <button 
                type="button"
                onClick={checkDomainAvailability}
                disabled={isChecking || !prefix.trim()} 
                className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isChecking ? '检查中...' : '检查域名可用性'}
            </button>
            
            {/* 注册按钮 - 只有在域名可用或未检查时才启用 */}
            <button 
                type="submit"
                disabled={loading || (isDomainAvailable === false)} 
                className={`w-full ${isDomainAvailable === true ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gradient-to-r from-blue-500/70 to-purple-600/70'} text-white px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {loading ? '注册中...' : '注册域名'}
            </button>
            
            {msg && (
                <div className={`text-sm p-2 rounded ${msg.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {msg.text}
                </div>
            )}
        </form>
    );
}
