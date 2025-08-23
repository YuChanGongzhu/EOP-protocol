"use client";
import { useState } from 'react';

interface BalanceModuleProps {
  title: string;
  amount: string;
  subAmount: string;
  address?: string;
}

export default function BalanceModule({ title, amount, subAmount, address }: BalanceModuleProps) {
  const [copied, setCopied] = useState(false);
  
  // 复制地址到剪贴板
  const copyAddressToClipboard = () => {
    if (!address) return;
    
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };
  
  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="balance-module">
      <div className="balance-header">
        <p>{title}</p>
        {address && (
          <div className="balance-address" onClick={copyAddressToClipboard}>
            <span>{formatAddress(address)}</span>
            {!copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            ) : (
              <svg style={{ color: '#10B981' }} xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}
      </div>
      <p className="balance-amount">{amount}</p>
      <p className="balance-usd">{subAmount}</p>
    </div>
  );
}
