-- 更新NFCWallet表，添加新字段
-- 执行时间：建议在系统维护期间执行

-- 添加publicKey字段
ALTER TABLE nfc_wallets 
ADD COLUMN IF NOT EXISTS public_key TEXT;

-- 添加nftTokenId字段
ALTER TABLE nfc_wallets 
ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(100);

-- 添加initialFunded字段
ALTER TABLE nfc_wallets 
ADD COLUMN IF NOT EXISTS initial_funded BOOLEAN DEFAULT FALSE;

-- 为现有记录设置默认值
UPDATE nfc_wallets 
SET initial_funded = FALSE 
WHERE initial_funded IS NULL;

-- 更新字段为NOT NULL（如果需要）
-- ALTER TABLE nfc_wallets 
-- ALTER COLUMN public_key SET NOT NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_nfc_wallets_nft_token_id ON nfc_wallets(nft_token_id);
CREATE INDEX IF NOT EXISTS idx_nfc_wallets_initial_funded ON nfc_wallets(initial_funded);
CREATE INDEX IF NOT EXISTS idx_nfc_wallets_created_at ON nfc_wallets(created_at);

-- 显示更新后的表结构
\d nfc_wallets; 