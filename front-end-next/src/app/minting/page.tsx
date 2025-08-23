"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DomainRegisterForm from '@/components/DomainRegisterForm';
import { NfcApi } from '@/lib/api';
import './minting.css';

export default function MintingPage() {
  return (
    <Suspense fallback={null}>
      <MintingContent />
    </Suspense>
  );
}

function MintingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'domain' | 'minting'>('domain');
  const [domain, setDomain] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nfcUid, setNfcUid] = useState<string | null>(null);

  // 检查域名可用性（以太坊版不支持域名）
  const checkDomainAvailability = async () => {
    setIsAvailable(false);
    setError('以太坊版本不支持域名');
  };

  // 处理铸造过程（以太坊版不支持域名）
  const handleMint = async () => {
    setError('以太坊版本不支持域名');
  };

  // 处理手动注册成功
  const handleManualRegisterSuccess = (domain: string) => {
    setError(null);
    setMintingStatus('注册成功');
    localStorage.setItem('userDomain', domain);
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  // 从URL参数或localStorage获取NFC UID
  useEffect(() => {
    const uidFromUrl = searchParams.get('uid');
    if (uidFromUrl) {
      setNfcUid(uidFromUrl);
      localStorage.setItem('nfcUid', uidFromUrl);
    } else {
      const storedUid = localStorage.getItem('nfcUid') || sessionStorage.getItem('nfcUid');
      if (storedUid) {
        setNfcUid(storedUid);
      }
    }
  }, [searchParams]);

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-black">
      {/* 返回按钮 */}
      <button 
        onClick={() => router.push('/nfc-scan')}
        className="absolute top-4 left-4 z-50 bg-white/10 hover:bg白/20 rounded-full p-2 text-white transition-all duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* 动画背景 */}
      <div className="animated-background">
        <div className="blur-orb orb1"></div>
        <div className="blur-orb orb2"></div>
        <div className="blur-orb orb3"></div>
        <div className="blur-orb orb4"></div>
        <div className="blur-orb orb5"></div>
        <div className="blur-orb orb6"></div>
        <div className="blur-orb orb7"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div className="geo-shape"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* 铸造容器 */}
      <div className="minting-container">
        <div className="minting-card">
          {step === 'domain' ? (
            <div id="minting-step-domain">
              <h2 className="minting-title">域名功能已移除</h2>

              {nfcUid && (
                <>
                  {/* 域名输入 */}
                  <p className="text-white/70 text-center">以太坊版无需域名，直接使用钱包地址与 NFC 交互。</p>

                  {/* 检查按钮 */}
                  <button className="minting-mint-btn-disabled" disabled>不可用</button>

                  {/* 反馈信息 */}
                  <div className="minting-feedback">
                    <p className="minting-error">此页面仅保留占位，域名流程已移除。</p>
                    {error && <p className="minting-error">{error}</p>}
                  </div>
                </>
              )}

              {/* 如果没有NFC UID，显示DomainRegisterForm */}
              {!nfcUid ? (
                <div className="mt-4">
                  <p className="text-white/70 text-center mb-6">请输入您的NFC卡片UID和域名前缀进行注册</p>
                  <DomainRegisterForm onSuccess={handleManualRegisterSuccess} />
                </div>
              ) : (
                <div className="mt-4 text-center">
                  <p className="text-white/70 text-sm">
                    已检测到NFC卡片: <span className="text-blue-400">{nfcUid}</span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div id="minting-step-minting">
              <div className="minting-spinner">
                <svg className="w-16 h-16 text-blue-500" xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  strokeLinejoin="round">
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <p className="minting-status">
                {mintingStatus === '完成' ? (
                  <span className="emoji-fade-in">完成</span>
                ) : (
                  mintingStatus
                )}
              </p>
            </div>
          )}
        </div>

        {/* Powered by Image */}
        <div className="powered-by-container">
          <span className="powered-by-text">Powered by</span>
          <img src="/injbg.png" alt="Injective" className="powered-by-image" />
        </div>
      </div>
    </div>
  );
}