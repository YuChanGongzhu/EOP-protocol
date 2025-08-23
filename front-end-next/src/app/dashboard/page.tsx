"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import IdCard from '@/components/dashboard/IdCard';
import BalanceModule from '@/components/dashboard/BalanceModule';
import CollectionGrid from '@/components/dashboard/CollectionGrid';
import { NfcApi } from '@/lib/api';
import { Logger } from '@/lib/logger';
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
  const [activeTab, setActiveTab] = useState('总览');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);

  // 从 localStorage 读取真实钱包（无则由 API 创建）

  useEffect(() => {
    // 从localStorage获取用户数据
    const loadUserData = async () => {
      try {
        const storedDomain = null;
        const storedNfcUid = localStorage.getItem('nfcUid');

        // 使用存储的域名或默认域名
        const userDomain = 'user.egoda';

        if (!storedDomain) {
          console.log('未找到用户域名，使用默认值');
          // 不再重定向到minting页面，直接在dashboard中处理
        }

        // 获取或创建真实钱包
        let walletAddress = localStorage.getItem('walletAddress');
        let storedWallet = localStorage.getItem('traditionalWallet');
        if (!storedWallet) {
          // 创建钱包并存储
          const created = await NfcApi.createWallet();
          Logger.info('Dashboard: auto-created wallet', { address: created.address });
          storedWallet = JSON.stringify(created);
        }
        if (!walletAddress && storedWallet) {
          try {
            const parsed = JSON.parse(storedWallet);
            walletAddress = parsed.address;
          } catch { }
        }
        // 若 NFC 已绑定特定地址，优先展示链上地址
        if (storedNfcUid) {
          try {
            const walletData = await NfcApi.wallet(storedNfcUid);
            if ((walletData as any)?.address) {
              walletAddress = (walletData as any).address;
            }
          } catch { }
        }
        if (walletAddress) {
          localStorage.setItem('walletAddress', walletAddress);
        }
        // 兜底，确保为字符串
        walletAddress = walletAddress || '';

        // 生成NFT图像URL
        const imageUrl = localStorage.getItem('nftImageUrl') ||
          `https://placehold.co/400x600/FFFFFF/1F2937?text=${userDomain}`;

        Logger.info('Dashboard: user data ready', { walletAddress: walletAddress });
        setUserData({
          domain: userDomain,
          imageUrl: imageUrl,
          walletAddress: walletAddress
        });

        // 设置密钥显示
        try {
          const parsed = storedWallet ? JSON.parse(storedWallet) : null;
          if (parsed?.publicKey) setPublicKey(parsed.publicKey);
          if (parsed?.privateKey) setPrivateKey(parsed.privateKey);
        } catch { }

        // 获取余额数据（非空且为以太坊地址时）
        if (walletAddress && /^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
          fetchBalances(walletAddress);
        }
      } catch (error) {
        Logger.error('Dashboard: 加载用户数据失败', error);
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
      Logger.info('Dashboard: balances', balanceData);
      setBalances({
        eth: balanceData.eth || '0',
        usdt: balanceData.usdt || '0',
        xp: '100' // 示例XP值，API中可能没有返回
      });
    } catch (error) {
      Logger.error('Dashboard: 获取余额失败', error);
      // 使用模拟数据
      setBalances({
        eth: '0',
        usdt: '0',
        xp: '100'
      });
    }
  };

  // 处理标签切换
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // 处理铸造
  const handleMint = () => {
    console.log('铸造ETH CATS');
    // 这里可以添加铸造逻辑
  };

  // 处理导出私钥
  const handleExportPrivateKey = () => {
    setShowPrivateKeyModal(true);
  };

  // 关闭私钥弹窗
  const closePrivateKeyModal = () => {
    setShowPrivateKeyModal(false);
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
                <span className="wallet-name">您的地址</span>
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
              +¥{parseFloat(balances.usdt) * 0.1} (+N/A) 1月
            </div>
          </div>
        </div>

        {/* 资产分类标签 */}
        <div className="asset-tabs">
          <button
            className={`tab-btn ${activeTab === '总览' ? 'active' : ''}`}
            onClick={() => handleTabChange('总览')}
          >
            总览
          </button>
          <button
            className={`tab-btn ${activeTab === '生态' ? 'active' : ''}`}
            onClick={() => handleTabChange('生态')}
          >
            生态
          </button>
          <button
            className={`tab-btn ${activeTab === '设置' ? 'active' : ''}`}
            onClick={() => handleTabChange('设置')}
          >
            设置
          </button>
        </div>

        {/* 内容区域 */}
        {activeTab === '总览' && (
          <div className="asset-list">
            <div className="asset-header">
              <span className="asset-title">资产总值</span>
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
                  <span className="balance-amount">0</span>
                  <span className="balance-value">¥0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === '生态' && (
          <div className="ecosystem-list">
            <div className="ecosystem-header">
              <span className="ecosystem-title">生态项目</span>
            </div>

            <div className="ecosystem-items">
              <div className="ecosystem-item">
                <div className="ecosystem-icon">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div className="ecosystem-info">
                  <span className="ecosystem-name">ETH CATS</span>
                  <span className="ecosystem-desc">以太坊猫咪NFT系列</span>
                </div>
                <button className="mint-btn" onClick={handleMint}>
                  铸造
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === '设置' && (
          <div className="settings-list">
            <div className="settings-header">
              <span className="settings-title">设置</span>
            </div>

            <div className="settings-items">
              <div className="settings-item">
                <div className="settings-icon">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div className="settings-info">
                  <span className="settings-name">私钥</span>
                  <span className="settings-desc">管理您的私钥</span>
                </div>
                <button className="export-btn" onClick={handleExportPrivateKey}>
                  导出
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Powered by */}
      <div className="powered-by-container">
        <span className="powered-by-text">ETH SZ Hackathon Preview</span>
      </div>

      {/* 私钥弹窗 */}
      {showPrivateKeyModal && (
        <div className="private-key-modal-overlay" onClick={closePrivateKeyModal}>
          <div className="private-key-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="private-key-modal-header">
              <h3 className="private-key-modal-title">私钥信息</h3>
              <button className="private-key-modal-close-btn" onClick={closePrivateKeyModal}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="private-key-modal-body">
              <div className="private-key-info">
                <h4 className="private-key-label">您的私钥：</h4>
                <div className="private-key-value">{privateKey}</div>
                <p className="private-key-warning">
                  ⚠️ 请妥善保管，不要泄露给他人！私钥是您资产的唯一凭证。
                </p>
              </div>
            </div>

            <div className="private-key-modal-footer">
              <button className="private-key-modal-close-button" onClick={closePrivateKeyModal}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
