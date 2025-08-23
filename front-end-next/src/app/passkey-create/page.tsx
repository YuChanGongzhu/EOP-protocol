"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPasskey } from '@/lib/passkey';
import { NfcApi } from '@/lib/api';
import { Logger } from '@/lib/logger';
import './passkey-create.css';

export default function PasskeyCreatePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [language, setLanguage] = useState('zh');

  // 处理返回按钮
  const handleGoBack = () => {
    router.push('/wallet-screen');
  };

  // 注意：是否存在 Passkey 的检测和自动登录已移动至 /passkey-check，避免重复发起 WebAuthn 导致 “A request is already pending.”

  // 处理创建Passkey
  const handleCreatePasskey = async () => {
    if (!username.trim()) {
      setStatus('error');
      setErrorMessage('请输入用户名');
      return;
    }

    setStatus('creating');
    setErrorMessage('');
    Logger.info('Passkey/Create: start', { username: username.trim() });

    try {
      const result = await createPasskey(username.trim());
      Logger.info('Passkey/Create: result', result);

      if (result.success) {
        // 无条件创建并激活一个新的本地以太坊钱包，并与该 Passkey 关联
        const created = await NfcApi.createWallet();
        Logger.info('Wallet/Create: created', { address: created.address });
        if (result.keyId) {
          const raw = localStorage.getItem('passkeyWallets');
          const map = raw ? JSON.parse(raw) : {};
          map[result.keyId] = created;
          localStorage.setItem('passkeyWallets', JSON.stringify(map));
          localStorage.setItem('activePasskeyId', result.keyId);
        }
        setStatus('success');
        Logger.info('Passkey/Create: success, redirect to /dashboard in 2s');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.error || '创建失败，请重试');
        Logger.error('Passkey/Create: failed', result.error);
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || '创建失败，请重试');
      Logger.error('Passkey/Create: exception', error);
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (status) {
      case 'creating':
        return language === 'zh' ? '正在创建云托管通行证...' : 'Creating cloud-hosted passkey...';
      case 'success':
        return language === 'zh' ? '创建成功！正在跳转...' : 'Created successfully! Redirecting...';
      case 'error':
        return errorMessage || (language === 'zh' ? '创建失败，请重试' : 'Creation failed, please try again');
      default:
        return '';
    }
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

      {/* Passkey创建容器 */}
      <div className="passkey-create-container">
        <div className="passkey-create-card">
          <div className="passkey-create-header">
            <div className="passkey-icon">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="passkey-title">
              {language === 'zh' ? '创建您的云上身份' : 'Create Your Cloud Identity'}
            </h2>
            <p className="passkey-subtitle">
              {language === 'zh' ? '来访问以太坊生态系统' : 'To access the Ethereum ecosystem'}
            </p>
          </div>

          <div className="passkey-create-form">
            <div className="input-group">
              <label htmlFor="passkey-username" className="input-label">
                {language === 'zh' ? '您希望Egoda如何称呼您' : 'How would you like Egoda to call you'}
              </label>
              <input
                type="text"
                id="passkey-username"
                className="input-field"
                placeholder={language === 'zh' ? '请输入您的昵称' : 'Enter your nickname'}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={status === 'creating'}
                suppressHydrationWarning={true}
              />
              <small className="input-hint">
                {language === 'zh' ? '信息将储存至iCloud' : 'Information will be stored in iCloud'}
              </small>
            </div>

            <button
              className="passkey-create-btn"
              onClick={handleCreatePasskey}
              disabled={status === 'creating' || !username.trim()}
            >
              <span>
                {status === 'creating'
                  ? (language === 'zh' ? '创建中...' : 'Creating...')
                  : (language === 'zh' ? '继续' : 'Continue')
                }
              </span>
            </button>

            <button
              className="passkey-back-btn"
              onClick={handleGoBack}
              disabled={status === 'creating'}
            >
              <span>{language === 'zh' ? '返回' : 'Back'}</span>
            </button>
          </div>

          {/* 状态显示 */}
          {status !== 'idle' && (
            <div className={`passkey-status ${status}`}>
              {getStatusText()}
            </div>
          )}
        </div>
      </div>

      {/* Powered by 文本 */}
      <div className="powered-by-container">
        <span className="powered-by-text">ETH SZ Hackathon Preview</span>
      </div>
    </div>
  );
}
