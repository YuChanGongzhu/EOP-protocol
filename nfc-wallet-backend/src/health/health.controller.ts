import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
    @Get('health')
    @ApiOperation({ summary: '健康检查' })
    @ApiResponse({ status: 200, description: '服务正常运行' })
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'nfc-wallet-backend',
            version: '1.0.0'
        };
    }

    @Get('api/health')
    @ApiOperation({ summary: 'API健康检查' })
    @ApiResponse({ status: 200, description: 'API服务正常运行' })
    getApiHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'nfc-wallet-backend-api',
            version: '1.0.0'
        };
    }
}
