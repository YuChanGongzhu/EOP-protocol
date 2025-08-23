"use client";
import { useState } from 'react';

interface CollectionItem {
  id: string;
  image?: string;
  icon?: React.ReactNode;
  backIcon: string;
  backText: string;
}

export default function CollectionGrid() {
  // 收藏品数据
  const collections: CollectionItem[] = [
    {
      id: '1',
      image: '/advx.png',
      backIcon: '🔗',
      backText: 'Fully On-Chain',
    },
    {
      id: '2',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
      backIcon: '🔗',
      backText: 'Fully On-Chain',
    },
    {
      id: '3',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
      backIcon: '🔗',
      backText: 'Fully On-Chain',
    },
  ];
  
  // 跟踪哪些卡片被翻转
  const [flippedItems, setFlippedItems] = useState<Record<string, boolean>>({});
  
  // 处理卡片点击
  const handleItemClick = (id: string) => {
    setFlippedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="collection-grid">
      {collections.map((item) => (
        <div 
          key={item.id}
          className={`collection-item ${flippedItems[item.id] ? 'flipped' : ''}`}
          onClick={() => handleItemClick(item.id)}
        >
          <div className="collection-item-inner">
            <div className="collection-item-front">
              {item.image ? (
                <img src={item.image} alt="Collection Item" />
              ) : item.icon ? (
                item.icon
              ) : null}
            </div>
            <div className="collection-item-back">
              <div className="collection-back-content">
                <div className="collection-back-icon">{item.backIcon}</div>
                <div className="collection-back-text">{item.backText}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
