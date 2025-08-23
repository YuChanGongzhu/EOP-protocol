"use client";
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

interface IdCardProps {
  domain: string;
  imageUrl: string;
  walletAddress: string;
}

export default function IdCard({ domain, imageUrl, walletAddress }: IdCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  // 自动翻转动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlipped(true);
      
      setTimeout(() => {
        setIsFlipped(false);
      }, 3000);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 处理卡片点击
  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };
  
  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={`id-card ${isFlipped ? 'flipped' : ''}`} onClick={handleCardClick}>
      <div className="id-card-inner">
        <div className="id-card-front">
          <img src={imageUrl} alt={domain} />
          <div className="id-card-gradient"></div>
          <div className="id-card-text">
            <h3>{domain}</h3>
            <p>inj Identity Pass</p>
          </div>
        </div>
        <div className="id-card-back">
          <div className="qrcode">
            <QRCode 
              value={walletAddress} 
              size={150}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
              bgColor="#FFFFFF"
              fgColor="#1F2937"
            />
          </div>
          <div className="address-label">Injective Address</div>
          <div className="address-value">{walletAddress}</div>
        </div>
      </div>
    </div>
  );
}
