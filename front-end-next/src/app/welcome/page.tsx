"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation'; 
import Image from 'next/image';
import './welcome.css';

export default function Welcome() {
  const router = useRouter();
  const [language, setLanguage] = useState('zh');

  const handleCreatePass = () => {
    router.push('/wallet-screen');
  };

  return (
            <div className="relative min-h-screen w-screen overflow-hidden bg-white">
        {/* 背景特效 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-screen bg-gradient-radial from-[#56f5ca]/10 to-transparent to-70% z-[1] pointer-events-none"></div>
        


        {/* 主要内容 */}
        <div className="flex items-center justify-start m-0 max-w-4xl w-full h-screen px-8 relative z-[2]">
          {/* 主要内容 */}
          <div className="text-left">

            

            
            {/* 标题 */}
            <h2 className="text-7xl font-black m-0 mb-4 text-black animate-title-appear">
              Egoda<span className="animate-dot-blink">.</span>
            </h2>
            
            {/* 副标题 */}
            <p className="text-xl text-gray-600 m-0 mb-10 leading-relaxed font-medium animate-subtitle-appear">
              {language === 'zh' ? '让Web3在Web2随处发生' : 'Make Web3 happen everywhere in Web2'}
            </p>
            
            {/* 功能标签 */}
            <div className="mb-10">
              <div className="flex flex-wrap gap-3 justify-center">
                <span className="text-gray-600 text-base font-medium">{language === 'zh' ? '钱包' : 'Wallet'}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600 text-base font-medium">{language === 'zh' ? '交易' : 'Trade'}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600 text-base font-medium">NFT</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600 text-base font-medium">DeFi</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600 text-base font-medium">DApp</span>
              </div>
            </div>
            
            {/* 按钮 */}
            <button 
              onClick={handleCreatePass}
              className="group relative overflow-hidden bg-black text-white py-3 px-16 rounded-xl text-lg font-semibold tracking-wider shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-gray-800 w-full max-w-sm mx-auto"
            >
              <span>{language === 'zh' ? '立刻开始' : 'Start Now'}</span>
            </button>
          </div>


        </div>
      </div>
  );
}