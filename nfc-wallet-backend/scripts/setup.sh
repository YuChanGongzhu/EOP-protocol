#!/bin/bash

# NFC钱包后端项目设置脚本
# 用于快速设置开发和生产环境

set -e

echo "🚀 NFC钱包后端项目设置开始..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Node.js版本
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js未安装，请先安装Node.js 18+${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js版本过低，请升级到18+${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js版本检查通过: $(node -v)${NC}"
}

# 检查Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker未安装，将跳过Docker相关设置${NC}"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker Compose未安装，将跳过Docker相关设置${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Docker检查通过${NC}"
    return 0
}

# 生成随机密钥
generate_key() {
    openssl rand -hex 32
}

# 设置环境变量
setup_env() {
    if [ ! -f .env ]; then
        echo "📝 创建环境变量文件..."
        cp env.example .env
        
        # 生成随机密钥
        AES_KEY=$(generate_key)
        JWT_SECRET=$(openssl rand -base64 32)
        
        # 替换密钥
        sed -i "s/your-32-byte-hex-key-here-64-characters-long-string-example/$AES_KEY/g" .env
        sed -i "s/your-jwt-secret-key/$JWT_SECRET/g" .env
        
        echo -e "${GREEN}✅ 环境变量文件已创建并配置随机密钥${NC}"
    else
        echo -e "${YELLOW}⚠️  .env文件已存在，跳过创建${NC}"
    fi
}

# 安装依赖
install_deps() {
    echo "📦 安装项目依赖..."
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 生成Prisma客户端
setup_prisma() {
    echo "🗄️  生成Prisma客户端..."
    npm run prisma:generate
    echo -e "${GREEN}✅ Prisma客户端生成完成${NC}"
}

# 设置数据库（如果Docker可用）
setup_database() {
    if check_docker; then
        echo "🐳 启动PostgreSQL数据库..."
        docker-compose up -d postgres
        
        # 等待数据库启动
        echo "⏳ 等待数据库启动..."
        sleep 10
        
        # 运行数据库迁移
        echo "🗄️  运行数据库迁移..."
        npm run prisma:push
        
        echo -e "${GREEN}✅ 数据库设置完成${NC}"
    else
        echo -e "${YELLOW}⚠️  Docker不可用，请手动设置PostgreSQL数据库${NC}"
        echo "数据库连接字符串示例: postgresql://username:password@localhost:5432/nfc_wallet"
    fi
}

# 创建必要目录
setup_directories() {
    echo "📁 创建必要目录..."
    mkdir -p logs
    mkdir -p ssl
    echo -e "${GREEN}✅ 目录创建完成${NC}"
}

# 运行测试
run_tests() {
    echo "🧪 运行测试..."
    if npm run test; then
        echo -e "${GREEN}✅ 测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  部分测试失败，请检查${NC}"
    fi
}

# 主函数
main() {
    echo "选择设置模式:"
    echo "1) 开发环境设置"
    echo "2) 生产环境设置"
    echo "3) 快速设置（推荐）"
    read -p "请输入选择 (1-3): " choice
    
    case $choice in
        1)
            echo "🔧 开发环境设置..."
            check_node
            setup_env
            install_deps
            setup_prisma
            setup_directories
            setup_database
            run_tests
            echo -e "${GREEN}🎉 开发环境设置完成！${NC}"
            echo "运行 'npm run start:dev' 启动开发服务器"
            ;;
        2)
            echo "🚀 生产环境设置..."
            check_node
            check_docker || exit 1
            setup_env
            install_deps
            setup_prisma
            setup_directories
            
            echo "🐳 启动生产环境..."
            docker-compose up -d
            
            echo -e "${GREEN}🎉 生产环境设置完成！${NC}"
            echo "访问 http://localhost:3000/api 查看API文档"
            ;;
        3)
            echo "⚡ 快速设置..."
            check_node
            setup_env
            install_deps
            setup_prisma
            setup_directories
            
            if check_docker; then
                setup_database
            fi
            
            echo -e "${GREEN}🎉 快速设置完成！${NC}"
            echo "运行 'npm run start:dev' 启动开发服务器"
            echo "或运行 'docker-compose up -d' 启动完整环境"
            ;;
        *)
            echo -e "${RED}❌ 无效选择${NC}"
            exit 1
            ;;
    esac
}

# 显示帮助信息
show_help() {
    echo "NFC钱包后端设置脚本"
    echo ""
    echo "用法: ./setup.sh [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -d, --dev      仅开发环境设置"
    echo "  -p, --prod     仅生产环境设置"
    echo "  --clean        清理Docker容器和镜像"
    echo ""
}

# 清理功能
clean_docker() {
    echo "🧹 清理Docker环境..."
    docker-compose down -v
    docker system prune -f
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 参数处理
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -d|--dev)
        choice=1
        main
        ;;
    -p|--prod)
        choice=2
        main
        ;;
    --clean)
        clean_docker
        ;;
    *)
        main
        ;;
esac 