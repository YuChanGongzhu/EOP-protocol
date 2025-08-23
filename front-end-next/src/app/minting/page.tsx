"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DomainRegisterForm from '@/components/DomainRegisterForm';
import { NfcApi } from '@/lib/api';
import './minting.css';

export default function MintingPage() {
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

  // 检查域名可用性
  const checkDomainAvailability = async () => {
    if (!domain.trim()) return;
    
    setIsChecking(true);
    setError(null);
    
    try {
      // 使用NfcApi检查域名可用性
      const fullDomain = domain.trim();
      const result = await NfcApi.domainCheck(fullDomain);
      setIsAvailable(result.available);
    } catch (err: any) {
      console.error('检查域名失败:', err);
      setError(err?.message || '检查域名失败，请重试');
      setIsAvailable(false);
    } finally {
      setIsChecking(false);
    }
  };

  // 处理铸造过程
  const handleMint = async () => {
    if (!domain.trim() || !isAvailable || !nfcUid) return;
    
    setStep('minting');
    setIsMinting(true);
    setMintingStatus('正在铸造您的Injective身份...');
    
    try {
      // 注册域名
      const result = await NfcApi.domainRegister({ uid: nfcUid, domainPrefix: domain.trim() });
      
      setMintingStatus('完成');
      
      // 保存域名信息到localStorage，以便仪表盘页面使用
      localStorage.setItem('userDomain', result.domain || `advx-${domain.trim()}.inj`);
      
      // 铸造完成后跳转到仪表盘
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('铸造失败:', err);
      setError(err?.message || '铸造失败，请重试');
      setStep('domain');
    } finally {
      setIsMinting(false);
    }
  };

  // 处理手动注册成功
  const handleManualRegisterSuccess = (domain: string) => {
    // 显示成功消息
    setError(null);
    setMintingStatus('注册成功');
    
    // 保存域名信息到localStorage，以便仪表盘页面使用
    localStorage.setItem('userDomain', domain);
    
    // 短暂延迟后跳转到仪表盘
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  // 从URL参数或localStorage获取NFC UID
  useEffect(() => {
    // 首先尝试从URL参数获取
    const uidFromUrl = searchParams.get('uid');
    
    if (uidFromUrl) {
      setNfcUid(uidFromUrl);
      // 保存到localStorage以便后续使用
      localStorage.setItem('nfcUid', uidFromUrl);
    } else {
      // 尝试从localStorage获取
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
        className="absolute top-4 left-4 z-50 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-all duration-300"
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
              <h2 className="minting-title">
                <span className="emoji-fade-in">🌍</span> 创建您的.inj域名
              </h2>

              {nfcUid && (
                <>
                  {/* 域名输入 */}
                  <div className="minting-input-container">
                    <span className="minting-input-prefix">advx-</span>
                    <input 
                      type="text" 
                      className="minting-input" 
                      placeholder="例如: Vincent" 
                      value={domain}
                      onChange={(e) => {
                        setDomain(e.target.value);
                        setIsAvailable(null);
                      }}
                    />
                    <span className="minting-input-suffix">.inj</span>
                  </div>

                  {/* 检查按钮 */}
                  <button 
                    className="minting-check-btn" 
                    onClick={checkDomainAvailability}
                    disabled={isChecking || !domain.trim()}
                  >
                    {isChecking ? '检查中...' : '检查可用性'}
                  </button>

                  {/* 反馈信息 */}
                  <div className="minting-feedback">
                    {isAvailable === true && (
                      <>
                        <button 
                          className="minting-mint-btn"
                          onClick={handleMint}
                        >
                          铸造并激活
                        </button>
                        <p className="minting-fee-note">无需Gas费用</p>
                      </>
                    )}
                    
                    {isAvailable === false && (
                      <>
                        <p className="minting-error">域名已被注册</p>
                        <button 
                          className="minting-mint-btn-disabled"
                          disabled
                        >
                          铸造并激活
                        </button>
                      </>
                    )}
                    
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