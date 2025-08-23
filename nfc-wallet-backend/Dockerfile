# 使用官方Node.js 18镜像作为基础镜像
FROM node:18-alpine

# 安装必要的系统依赖，包括编译工具
RUN apk add --no-cache \
    openssl \
    curl \
    python3 \
    make \
    g++ \
    libc6-compat

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --omit=dev

# 复制项目文件
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/nfc/stats || exit 1

# 启动应用
CMD ["npm", "run", "start:prod"] 