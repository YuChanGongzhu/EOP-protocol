#!/bin/bash

# NFC 钱包系统智能合约测试脚本

echo "🧪 NFC 钱包系统智能合约测试"
echo "==============================="

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 forge 是否安装
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Forge 未安装，请先安装 Foundry${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 可用的测试选项：${NC}"
echo "1. 快速功能测试 (推荐)"
echo "2. CatCardNFT 测试"
echo "3. NFCWalletRegistry 测试"
echo "4. 所有测试"
echo "5. 详细测试输出"
echo ""

read -p "请选择测试选项 (1-5): " choice

case $choice in
    1)
        echo -e "${GREEN}🚀 运行快速功能测试...${NC}"
        forge test --match-contract QuickTest -vv
        ;;
    2)
        echo -e "${GREEN}🐱 运行 CatCardNFT 测试...${NC}"
        forge test --match-contract CatCardNFTTest -vv
        ;;
    3)
        echo -e "${GREEN}📱 运行 NFCWalletRegistry 测试...${NC}"
        forge test --match-contract NFCWalletRegistryTest -vv
        ;;
    4)
        echo -e "${GREEN}🔍 运行所有测试...${NC}"
        forge test -vv
        ;;
    5)
        echo -e "${GREEN}📝 运行详细测试输出...${NC}"
        forge test -vvv
        ;;
    *)
        echo -e "${RED}❌ 无效选项，请选择 1-5${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}📊 测试完成！${NC}"
echo ""
echo -e "${GREEN}✅ 推荐：运行选项 1 (快速功能测试) 来验证核心功能${NC}"
echo -e "${YELLOW}📖 查看 TEST_RESULTS.md 获取详细测试报告${NC}" 