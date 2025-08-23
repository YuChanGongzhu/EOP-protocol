#!/usr/bin/env node

/**
 * ABI文件复制脚本
 * 确保编译后的 dist 目录包含必要的 ABI 文件
 */

const fs = require('fs');
const path = require('path');

function copyABIs() {
    console.log('开始复制 ABI 文件...');

    const sourceDir = path.join(__dirname, 'src', 'contract', 'abis');
    const distDir = path.join(__dirname, 'dist', 'contract', 'abis');

    // 确保目标目录存在
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
        console.log(`创建目录: ${distDir}`);
    }

    // 复制所有 ABI 文件
    try {
        const files = fs.readdirSync(sourceDir);

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const sourcePath = path.join(sourceDir, file);
                const destPath = path.join(distDir, file);

                fs.copyFileSync(sourcePath, destPath);
                console.log(`✅ 复制: ${file}`);
            }
        });

        console.log('🎉 ABI 文件复制完成！');
    } catch (error) {
        console.error('❌ 复制 ABI 文件时出错:', error.message);
        process.exit(1);
    }
}

// 执行复制
copyABIs();
