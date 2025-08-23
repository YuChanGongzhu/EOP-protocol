"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import IdCard from '@/components/dashboard/IdCard';
import BalanceModule from '@/components/dashboard/BalanceModule';
import CollectionGrid from '@/components/dashboard/CollectionGrid';
import { NfcApi } from '@/lib/api';
import './dashboard.css';

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<{
    domain: string;
    imageUrl: string;
    walletAddress: string;
  } | null>(null);
  
  const [balances, setBalances] = useState({
    eth: '0',
    usdt: '0',
    xp: '0'
  });
  
  const [loading, setLoading] = useState(true);

  // 生成模拟钱包地址
  const generateMockAddress = (uid: string | null): string => {
    if (!uid) return '0x' + Math.random().toString(36).substring(2, 15);
    return '0x' + uid.replace(/:/g, '').substring(0, 38);
  };

  useEffect(() => {
    // 从localStorage获取用户数据
    const loadUserData = async () => {
      try {
        const storedDomain = localStorage.getItem('userDomain');
        const storedNfcUid = localStorage.getItem('nfcUid');
        
        // 使用存储的域名或默认域名
        const userDomain = storedDomain || 'user.egoda';
        
        if (!storedDomain) {
          console.log('未找到用户域名，使用默认值');
          // 不再重定向到minting页面，直接在dashboard中处理
        }
        
        // 获取或生成钱包地址
        let walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress) {
          // 如果没有存储的钱包地址，尝试从API获取或生成一个模拟地址
          try {
            if (storedNfcUid) {
              const walletData = await NfcApi.wallet(storedNfcUid);
              walletAddress = walletData.address;
            }
          } catch (error) {
            console.error('获取钱包地址失败:', error);
          }
          
          // 如果API调用失败或没有NFC UID，生成一个模拟地址
          if (!walletAddress) {
            walletAddress = generateMockAddress(storedNfcUid);
          }
          
          // 保存到localStorage
          localStorage.setItem('walletAddress', walletAddress);
        }
        
        // 生成NFT图像URL
        const imageUrl = localStorage.getItem('nftImageUrl') || 
          `https://placehold.co/400x600/FFFFFF/1F2937?text=${userDomain}`;
        
        setUserData({
          domain: userDomain,
          imageUrl: imageUrl,
          walletAddress: walletAddress
        });
        
        // 获取余额数据
        fetchBalances(walletAddress);
      } catch (error) {
        console.error('加载用户数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [router]);
  
  // 获取余额数据
  const fetchBalances = async (address: string) => {
    try {
      // 调用API获取余额
      const balanceData = await NfcApi.balance(address);
      setBalances({
        eth: balanceData.eth || '0',
        usdt: balanceData.usdt || '0',
        xp: '100' // 示例XP值，API中可能没有返回
      });
    } catch (error) {
      console.error('获取余额失败:', error);
      // 使用模拟数据
      setBalances({
        eth: '1',
        usdt: '0',
        xp: '100'
      });
    }
  };

  // 如果正在加载或没有用户数据，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-black text-xl">加载中...</div>
      </div>
    );
  }
  
  // 如果没有用户数据，将在useEffect中重定向
  if (!userData) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-white">
      {/* 背景特效 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-gradient-radial from-[#56f5ca]/10 to-transparent to-70% z-[1] pointer-events-none"></div>
      
      {/* 主内容 */}
      <div className="dashboard-container">
        {/* 钱包概览 */}
        <div className="wallet-overview">
          <div className="wallet-header">
            <div className="wallet-info">
              <div className="wallet-icon">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="wallet-details">
                <span className="wallet-name">通行密钥钱包</span>
                <div className="wallet-address">
                  <span className="address-text">{userData.walletAddress.substring(0, 6)}...{userData.walletAddress.substring(userData.walletAddress.length - 4)}</span>
                  <button className="copy-btn">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="egoda-badge">Egoda</div>
          </div>
          
          {/* 主余额显示 */}
          <div className="main-balance">
            <div className="balance-amount">¥{balances.usdt}</div>
            <div className="balance-change">
              +¥{parseFloat(balances.usdt) * 0.1} (+{Math.floor(Math.random() * 100 + 200)}%) 1月
            </div>
          </div>
        </div>
        
        {/* 资产分类标签 */}
        <div className="asset-tabs">
          <button className="tab-btn active">币种</button>
          <button className="tab-btn">DeFi</button>
          <button className="tab-btn">NFT</button>
          <button className="tab-btn">授权</button>
        </div>
        
        {/* 资产列表 */}
        <div className="asset-list">
          <div className="asset-header">
            <span className="asset-title">资产总值</span>
            <span className="asset-total">¥{balances.usdt}</span>
            <button className="sort-btn">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <div className="asset-items">
            <div className="asset-item">
              <div className="asset-icon eth">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="asset-info">
                <span className="asset-name">Holesky ETH</span>
                <span className="asset-price">¥0</span>
              </div>
              <div className="asset-balance">
                <span className="balance-amount">1</span>
                <span className="balance-value">¥0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部导航栏 */}
      <div className="bottom-nav">
        <button className="nav-btn">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>首页</span>
        </button>
        <button className="nav-btn">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>发现</span>
        </button>
        <button className="nav-btn active">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>设置</span>
        </button>
      </div>
      
      {/* Powered by */}
      <div className="powered-by-container">
        <span className="powered-by-text">ETH SZ 黑客松伙伴</span>
      </div>
    </div>
  );
}
