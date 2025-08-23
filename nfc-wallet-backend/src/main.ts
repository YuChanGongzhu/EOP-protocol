import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 安全中间件
    app.use(helmet());

    // 全局验证管道
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // CORS配置
    app.enableCors({
        origin: process.env.NODE_ENV === 'production' ? false : true,
        credentials: true,
    });

    // API文档配置
    const config = new DocumentBuilder()
        .setTitle('NFC钱包API')
        .setDescription('基于NFC的以太坊钱包管理系统')
        .setVersion('1.0')
        .addApiKey(
            {
                type: 'apiKey',
                name: 'X-API-Key',
                in: 'header',
            },
            'api-key',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT || 8080;
    await app.listen(port);

    console.log(`🚀 NFC钱包API服务运行在 http://localhost:${port}`);
    console.log(`📚 API文档地址: http://localhost:${port}/api`);
}

bootstrap(); 