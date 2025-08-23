"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import './wallet.css';

export default function WalletScreen() {
  const router = useRouter();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [language, setLanguage] = useState('zh');
  const [isIPhone, setIsIPhone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);

  useEffect(() => {
    // 检测设备类型
    const userAgent = navigator.userAgent;
    setIsIPhone(/iPhone|iPad|iPod/.test(userAgent));
    setIsAndroid(/Android/.test(userAgent));
    
    // 根据设备类型默认选中
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      setSelectedWallet('passkey');
      handleWalletSelect('passkey');
    } else if (/Android/.test(userAgent)) {
      setSelectedWallet('nfc');
      handleWalletSelect('nfc');
    }
  }, []);

  // 处理钱包选择
  const handleWalletSelect = (wallet: string) => {
    setSelectedWallet(wallet);
    // 显示Adventure部分
    const adventureSection = document.getElementById('adventure-section');
    if (adventureSection) {
      adventureSection.style.display = 'block';
    }
    
    // 启用继续按钮
    const continueBtn = document.getElementById('wallet-continue-btn');
    if (continueBtn) {
      continueBtn.removeAttribute('disabled');
    }
  };

  // 处理返回按钮
  const handleGoBack = () => {
    router.push('/welcome');
  };

  // 处理继续按钮
  const handleContinue = () => {
    if (selectedWallet) {
      if (selectedWallet === 'passkey') {
        router.push('/passkey-create');
      } else {
        router.push('/nfc-scan');
      }
    }
  };

  // 处理跳过按钮
  const handleSkip = () => {
    router.push('/nfc-scan');
  };

  // 处理通行密钥说明弹窗
  const handlePasskeyInfo = () => {
    setShowPasskeyModal(true);
  };

  // 关闭弹窗
  const closeModal = () => {
    setShowPasskeyModal(false);
  };

  // 获取激活方式标题
  const getActivationTitle = () => {
    if (selectedWallet === 'passkey') {
      return 'iCloud云上贵州托管';
    } else if (selectedWallet === 'nfc') {
      return '拍卡即付';
    } else if (selectedWallet === 'web3') {
      return '使用传统Web3钱包';
    }
    return '选择激活方式';
  };

  // 获取激活方式描述
  const getActivationDescription = () => {
    if (selectedWallet === 'passkey') {
      return '由Apple进行支持';
    } else if (selectedWallet === 'nfc') {
      return 'Egoda支持将普通的NFC卡片变为您的专属钱包';
    } else if (selectedWallet === 'web3') {
      return 'Egoda将会您提供无Gas体验';
    }
    return '选择一个钱包继续，或跳过直接扫描 NFC';
  };

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-white">
      {/* 背景特效 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-gradient-radial from-[#56f5ca]/10 to-transparent to-70% z-[1] pointer-events-none"></div>

      {/* 返回按钮 */}
      <button 
        onClick={handleGoBack}
        className="absolute top-4 left-4 z-50 bg-black/10 hover:bg-black/20 rounded-full p-2 text-black transition-all duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* 钱包选择容器 */}
      <div className="wallet-selection-container">
        <h2 className="text-2xl font-bold text-black mb-2 text-left w-full">
          {language === 'zh' ? '选择方式' : 'Select Method'}
        </h2>
        <p className="wallet-subtitle text-left w-full">
          {language === 'zh' ? (
            <>
              Egoda提供多种便捷登录<br />
              或使用传统钱包
            </>
          ) : (
            <>
              Egoda provides multiple convenient login methods<br />
              or use traditional wallet
            </>
          )}
        </p>
        
        {/* 钱包选项卡片 */}
        <div className="wallet-cards">
          <button 
            className={`wallet-card ${selectedWallet === 'passkey' ? 'selected' : ''} ${isAndroid ? 'disabled' : ''}`}
            onClick={() => !isAndroid && handleWalletSelect('passkey')}
            disabled={isAndroid}
          >
            {!isAndroid && <span className="recommend-badge">推荐</span>}
            <div className="card-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="card-content">
              <h3 className="card-title">{isAndroid ? 'Android设备支持即将推出' : '通行密钥'}</h3>
              <p className="card-subtitle">使用面容ID继续</p>
            </div>
          </button>
          
          <button 
            className={`wallet-card ${selectedWallet === 'nfc' ? 'selected' : ''} ${isIPhone ? 'disabled' : ''}`}
            onClick={() => !isIPhone && handleWalletSelect('nfc')}
            disabled={isIPhone}
          >
            <div className="card-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="card-content">
              <h3 className="card-title">NFC卡片</h3>
              <p className="card-subtitle">{isIPhone ? 'iOS设备支持即将推出' : '进阶交易工具'}</p>
            </div>
          </button>
          
          <button 
            className={`wallet-card ${selectedWallet === 'web3' ? 'selected' : ''}`}
            onClick={() => handleWalletSelect('web3')}
          >
            <div className="card-icon">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 003 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="card-content">
              <h3 className="card-title">传统钱包</h3>
              <p className="card-subtitle">适合已有一定经验的人士</p>
            </div>
          </button>
        </div>
        
        {/* Adventure部分 */}
        <div id="adventure-section" className="hidden">
          <h2 className="text-xl font-bold text-black mt-8 mb-2">
            {getActivationTitle()}
          </h2>
          <p className="text-gray-600 mb-6">
            {getActivationDescription()}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              id="wallet-continue-btn"
              onClick={handleContinue}
              disabled={!selectedWallet}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {language === 'zh' ? '继续' : 'Continue'}
            </button>
            
            {selectedWallet !== 'web3' ? (
              <button 
                id="wallet-skip-btn"
                onClick={handlePasskeyInfo}
                className="btn-ghost"
              >
                {language === 'zh' ? '什么是通行密钥' : 'What is Passkey'}
              </button>
            ) : (
              <div className="btn-ghost invisible">
                <span>占位</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Powered by 文本 */}
      <div className="powered-by-container">
        <span className="powered-by-text">ETH SZ Hackathon Preview</span>
      </div>

      {/* 通行密钥说明弹窗 */}
      {showPasskeyModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">通行密钥</h3>
              <button className="modal-close-btn" onClick={closeModal}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="info-section">
                <h4 className="info-title">这是什么？</h4>
                <p className="info-content">
                  Apple 在 iOS 推出的"通行密钥"，不用记密码，靠面容或指纹登录；密钥放在 iCloud 钥匙串里，在你的设备间同步，日常更省心。
                </p>
              </div>
              
              <div className="info-section">
                <h4 className="info-title">怎么使用？</h4>
                <p className="info-content">
                  在 iOS 的 App 或网站登录时，选"用通行密钥登录"，按面容ID或触控ID确认即可；iCloud 会自动填入，Apple 设备之间也能配合使用。
                </p>
              </div>
              
              <div className="info-section">
                <h4 className="info-title">这安全吗？</h4>
                <p className="info-content">
                  通行密钥由 iOS 设备生成并存在 iCloud 钥匙串中，网站拿不到你的面容或指纹；Apple 做了全程加密和防钓鱼，比传统密码更让人放心。
                </p>
              </div>
            </div>
            
            <button className="modal-close-button" onClick={closeModal}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
