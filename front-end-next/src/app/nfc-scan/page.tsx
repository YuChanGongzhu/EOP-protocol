"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NfcRegisterForm from '@/components/NfcRegisterForm';
import type { WalletResponse } from '@/types/nfc';
import './nfc-scan.css';

export default function NfcScanPage() {
  const router = useRouter();
  const [scanStatus, setScanStatus] = useState<'initializing' | 'scanning' | 'success' | 'error' | 'manual'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [language, setLanguage] = useState('zh');

  // 处理返回按钮
  const handleGoBack = () => {
    router.push('/wallet-screen');
  };

  // 处理跳过按钮
  const handleSkip = () => {
    router.push('/minting');
  };

  // 处理手动输入模式
  const handleManualInput = () => {
    setScanStatus('manual');
  };

  // 处理NFC注册成功
  const handleNfcRegistered = (res: WalletResponse) => {
    console.log('NFC注册成功:', res);
    // 延迟跳转到铸造页面
    setTimeout(() => {
      router.push('/minting');
    }, 1500);
  };

  // 初始化NFC扫描
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initNfcScan = async () => {
      // 添加active类以触发动画
      const container = document.querySelector('.nfc-scan-container');
      if (container) {
        container.classList.add('active');
      }

      // 检查浏览器是否支持Web NFC API
      if (typeof window !== 'undefined' && 'NDEFReader' in window) {
        try {
          setScanStatus('scanning');
          // @ts-ignore - NDEFReader可能在TypeScript中未定义
          const ndef = new window.NDEFReader();
          
          // 监听NFC标签读取事件
          ndef.addEventListener('reading', (event: any) => {
            console.log('NFC标签检测到:', event);
            
            // 获取UID
            const uid = event.serialNumber;
            console.log('NFC UID:', uid);
            
            setScanStatus('success');
            
            // 延迟跳转到铸造页面
            timeoutId = setTimeout(() => {
              router.push('/minting');
            }, 1500);
          });
          
          // 监听读取错误
          ndef.addEventListener('readingerror', (error: any) => {
            console.error('NFC读取错误:', error);
            setScanStatus('error');
            setErrorMessage('读取失败，请重试');
          });
          
          // 开始扫描
          await ndef.scan();
          
        } catch (error: any) {
          console.error('NFC扫描失败:', error);
          setScanStatus('error');
          
          // 提供更友好的错误信息
          if (error.name === 'NotAllowedError') {
            setErrorMessage('需要NFC权限，请允许访问');
          } else if (error.name === 'NotSupportedError') {
            setErrorMessage('设备不支持NFC功能');
          } else if (error.name === 'NotReadableError') {
            setErrorMessage('无法读取NFC卡片');
          } else {
            setErrorMessage('扫描失败，请重试或手动输入');
          }
        }
      } else {
        console.warn('Web NFC API不受支持');
        setScanStatus('error');
        setErrorMessage('您的浏览器不支持NFC功能，请手动输入');
      }
    };

    // 延迟一点时间以确保DOM已加载
    const initTimeout = setTimeout(() => {
      initNfcScan();
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]);

  // 获取状态文本
  const getStatusText = () => {
    switch (scanStatus) {
      case 'initializing':
        return language === 'zh' ? '正在初始化NFC...' : 'Initializing NFC...';
      case 'scanning':
        return language === 'zh' ? '请将NFC卡片靠近手机...' : 'Please place your NFC card near your phone...';
      case 'success':
        return language === 'zh' ? '扫描成功！正在处理...' : 'Scan successful! Processing...';
      case 'error':
        return errorMessage || (language === 'zh' ? '扫描失败，请重试' : 'Scan failed, please try again');
      case 'manual':
        return language === 'zh' ? '请手动输入NFC信息' : 'Please enter NFC information manually';
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

      {/* NFC扫描容器 */}
      <div className="nfc-scan-container">
        <div className="nfc-scan-card">
          {scanStatus !== 'manual' ? (
            <>
              <div className="nfc-scan-header">
                <div className="nfc-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h2 className="nfc-title">
                  {language === 'zh' ? '正在扫描' : 'Scanning'}
                </h2>
                <p className="nfc-subtitle">
                  {language === 'zh' ? '请将您的AdventureX卡片靠近手机' : 'Please place your AdventureX card near your phone'}
                </p>
              </div>

              <div className="nfc-scan-animation">
                <div className="scan-circle">
                  <div className="scan-line"></div>
                </div>
              </div>

              <div className="nfc-scan-status">
                <p className="status-text">{getStatusText()}</p>
              </div>

              <div className="nfc-scan-actions">
                <button 
                  onClick={handleManualInput}
                  className="nfc-scan-btn"
                >
                  <span>{language === 'zh' ? '手动输入' : 'Manual Input'}</span>
                </button>

                <button 
                  onClick={handleSkip}
                  className="nfc-skip-btn"
                >
                  <span>{language === 'zh' ? '跳过扫描' : 'Skip Scanning'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="nfc-scan-header">
                <div className="nfc-icon">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <h2 className="nfc-title">
                  {language === 'zh' ? '手动输入' : 'Manual Input'}
                </h2>
                <p className="nfc-subtitle">
                  {language === 'zh' ? '请输入您的NFC卡片信息' : 'Please enter your NFC card information'}
                </p>
              </div>

              <div className="nfc-form-container">
                <NfcRegisterForm onRegistered={handleNfcRegistered} />
              </div>

              <button 
                onClick={() => setScanStatus('initializing')}
                className="nfc-back-btn"
              >
                <span>{language === 'zh' ? '返回扫描' : 'Back to Scanning'}</span>
              </button>
            </>
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