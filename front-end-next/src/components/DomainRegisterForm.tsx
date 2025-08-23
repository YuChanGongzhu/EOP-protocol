"use client";

interface DomainRegisterFormProps {
    onSuccess?: (domain: string) => void;
    className?: string;
}

export default function DomainRegisterForm({ onSuccess, className = '' }: DomainRegisterFormProps) {
    return (
        <div className={className}>
            <p className="text-sm text-white/70">以太坊版本不再提供域名注册（不使用 ENS）。</p>
        </div>
    );
}
