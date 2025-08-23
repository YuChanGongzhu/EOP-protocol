import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBody,
    ApiBadRequestResponse,
    ApiConflictResponse,
} from '@nestjs/swagger';
import { NFCService } from './nfc.service';
import { RegisterNFCDto } from './dto/register-nfc.dto';
import { UnbindNFCDto } from './dto/unbind-nfc.dto';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { NFCStatusResponseDto } from './dto/nfc-status-response.dto';
import { CardOwnershipResponseDto } from './dto/card-ownership-response.dto';
import { RegisterDomainDto, DomainNFTResponseDto } from './dto/domain-nft.dto';
import { DrawCatNFTDto, CatNFTResponseDto, CatNFTListDto, SocialStatsDto } from './dto/cat-nft.dto';

@ApiTags('NFC钱包管理')
@Controller('api/nfc')
export class NFCController {
    constructor(private readonly nfcService: NFCService) { }

    @Post('register')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '注册NFC卡片',
        description: '通过NFC UID注册并生成以太坊钱包，如果已存在则返回现有钱包信息。新建钱包将自动发送初始资金和铸造NFT',
    })
    @ApiResponse({
        status: 200,
        description: '成功注册或返回已有钱包',
        type: WalletResponseDto,
    })
    @ApiBadRequestResponse({
        description: 'NFC UID格式无效或其他输入错误',
    })
    @ApiConflictResponse({
        description: '该NFC UID已被注册',
    })
    async registerNFC(@Body() registerNFCDto: RegisterNFCDto): Promise<WalletResponseDto> {
        return this.nfcService.registerNFC(registerNFCDto);
    }

    @Get('wallet/:uid')
    @ApiOperation({
        summary: '根据UID获取钱包信息',
        description: '通过NFC UID查询对应的以太坊钱包信息',
    })
    @ApiParam({
        name: 'uid',
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @ApiResponse({
        status: 200,
        description: '成功获取钱包信息',
        type: WalletResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: '未找到对应的钱包',
    })
    async getWalletByUID(@Param('uid') uid: string): Promise<WalletResponseDto> {
        const wallet = await this.nfcService.getWalletByUID(uid);

        if (!wallet) {
            throw new NotFoundException('未找到对应的钱包');
        }

        return wallet;
    }

    @Get('domain/check')
    @ApiOperation({
        summary: '检查域名可用性',
        description: '检查指定的.inj域名是否可用',
    })
    @ApiQuery({
        name: 'domain',
        description: '域名（不包含.inj后缀）',
        example: 'alice',
    })
    @ApiResponse({
        status: 200,
        description: '成功检查域名可用性',
        schema: {
            type: 'object',
            properties: {
                available: {
                    type: 'boolean',
                    description: '域名是否可用',
                    example: true,
                },
                domain: {
                    type: 'string',
                    description: '完整域名',
                    example: 'alice.inj',
                },
            },
        },
    })
    async checkDomainAvailability(@Query('domain') domain: string) {
        return this.nfcService.checkDomainAvailability(domain);
    }

    @Post('domain/register')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '注册域名NFT',
        description: '为NFC卡片注册域名NFT（需要初始资金）',
    })
    @ApiResponse({
        status: 200,
        description: '成功注册域名NFT',
        type: DomainNFTResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: '请求参数无效或注册失败',
        schema: {
            type: 'object',
            properties: {
                statusCode: {
                    type: 'number',
                    description: 'HTTP状态码',
                    example: 400,
                },
                message: {
                    type: 'string',
                    description: '错误信息',
                    example: '域名已被占用',
                },
                error: {
                    type: 'string',
                    description: '错误类型',
                    example: 'Bad Request',
                },
            },
        },
    })
    async registerDomainNFT(@Body() registerDomainDto: RegisterDomainDto) {
        return this.nfcService.registerDomainNFT(registerDomainDto);
    }

    @Post('unbind')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '解绑NFC卡片',
        description: '解绑NFC卡片，删除钱包记录并销毁NFT',
    })
    @ApiResponse({
        status: 200,
        description: '成功解绑',
        schema: {
            type: 'object',
            properties: {
                success: {
                    type: 'boolean',
                    description: '是否成功',
                    example: true,
                },
                nfcUnbound: {
                    type: 'boolean',
                    description: 'NFC是否已解绑',
                    example: true,
                },
                nftBurned: {
                    type: 'boolean',
                    description: 'NFT是否已销毁',
                    example: true,
                },
                message: {
                    type: 'string',
                    description: '操作结果消息',
                    example: '解绑成功',
                },
            },
        },
    })
    async unbindNFC(@Body() unbindNFCDto: UnbindNFCDto) {
        return this.nfcService.unbindNFC(unbindNFCDto.uid);
    }

    @Get('stats')
    @ApiOperation({
        summary: '获取钱包统计信息',
        description: '获取系统中钱包的统计数据',
    })
    @ApiResponse({
        status: 200,
        description: '成功获取统计信息',
        schema: {
            type: 'object',
            properties: {
                totalWallets: {
                    type: 'number',
                    description: '总钱包数量',
                    example: 100,
                },
                walletsWithDomain: {
                    type: 'number',
                    description: '设置了域名的钱包数量',
                    example: 75,
                },
                walletsWithNFT: {
                    type: 'number',
                    description: '拥有NFT的钱包数量',
                    example: 80,
                },
                fundedWallets: {
                    type: 'number',
                    description: '已获得初始资金的钱包数量',
                    example: 90,
                },
                recentRegistrations: {
                    type: 'number',
                    description: '最近24小时注册的钱包数量',
                    example: 5,
                },
            },
        },
    })
    async getWalletStats() {
        return this.nfcService.getWalletStats();
    }

    @Get('balance/:address')
    @ApiOperation({
        summary: '查询钱包余额',
        description: '根据钱包地址查询 Injective 链上的余额信息',
    })
    @ApiParam({
        name: 'address',
        description: '钱包地址（支持 Injective 地址或以太坊地址）',
        example: 'inj1...'
    })
    @ApiResponse({
        status: 200,
        description: '成功获取余额信息',
        schema: {
            type: 'object',
            properties: {
                inj: {
                    type: 'string',
                    description: 'INJ 余额',
                    example: '100.5000',
                },
                usd: {
                    type: 'string',
                    description: 'USD 估值（如果可用）',
                    example: '2500.00',
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description: '地址格式无效',
    })
    async getWalletBalance(@Param('address') address: string) {
        return this.nfcService.getWalletBalance(address);
    }

    @Post('cat/draw')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: '抽卡获得小猫NFT',
        description: '为NFC卡片抽卡获得小猫NFT（需要初始资金）',
    })
    @ApiResponse({
        status: 200,
        description: '成功抽到小猫NFT',
        type: CatNFTResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: '请求参数无效或抽卡失败',
        schema: {
            type: 'object',
            properties: {
                statusCode: {
                    type: 'number',
                    description: 'HTTP状态码',
                    example: 400,
                },
                message: {
                    type: 'string',
                    description: '错误信息',
                    example: '小猫名称已被使用',
                },
                error: {
                    type: 'string',
                    description: '错误类型',
                    example: 'Bad Request',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: '未找到对应的NFC卡片',
    })
    async drawCatNFT(@Body() drawCatNFTDto: DrawCatNFTDto): Promise<CatNFTResponseDto> {
        return this.nfcService.drawCatNFT(drawCatNFTDto);
    }

    @Get('cat/list/:uid')
    @ApiOperation({
        summary: '获取用户的小猫NFT列表',
        description: '根据NFC UID获取用户拥有的所有小猫NFT',
    })
    @ApiParam({
        name: 'uid',
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @ApiResponse({
        status: 200,
        description: '成功获取小猫NFT列表',
        type: CatNFTListDto,
    })
    @ApiResponse({
        status: 404,
        description: '未找到对应的NFC卡片',
    })
    async getUserCatNFTs(@Param('uid') uid: string): Promise<CatNFTListDto> {
        return this.nfcService.getUserCatNFTs(uid);
    }

    @Get('cat/social/:uid')
    @ApiOperation({
        summary: '获取NFC的社交统计信息',
        description: '获取NFC的抽卡次数、已互动NFC列表和社交奖励信息',
    })
    @ApiParam({
        name: 'uid',
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @ApiResponse({
        status: 200,
        description: '成功获取社交统计信息',
        type: SocialStatsDto,
    })
    @ApiResponse({
        status: 404,
        description: '未找到对应的NFC卡片',
    })
    async getSocialStats(@Param('uid') uid: string): Promise<SocialStatsDto> {
        return this.nfcService.getSocialStats(uid);
    }

    @Post('cat/check-interaction')
    @ApiOperation({
        summary: '检查两个NFC是否已经互动过',
        description: '检查两个NFC卡片是否已经进行过社交抽卡互动',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                nfc1: {
                    type: 'string',
                    description: '第一个NFC UID',
                    example: '04:1a:2b:3c:4d:5e:6f',
                },
                nfc2: {
                    type: 'string',
                    description: '第二个NFC UID',
                    example: '04:2b:3c:4d:5e:6f:7a',
                },
            },
            required: ['nfc1', 'nfc2'],
        },
    })
    @ApiResponse({
        status: 200,
        description: '成功检查互动状态',
        schema: {
            type: 'object',
            properties: {
                hasInteracted: {
                    type: 'boolean',
                    description: '是否已经互动过',
                    example: false,
                },
                nfc1: {
                    type: 'string',
                    description: '第一个NFC UID',
                    example: '04:1a:2b:3c:4d:5e:6f',
                },
                nfc2: {
                    type: 'string',
                    description: '第二个NFC UID',
                    example: '04:2b:3c:4d:5e:6f:7a',
                },
            },
        },
    })
    async checkInteraction(@Body() body: { nfc1: string; nfc2: string }) {
        const hasInteracted = await this.nfcService.checkInteraction(body.nfc1, body.nfc2);
        return {
            hasInteracted,
            nfc1: body.nfc1,
            nfc2: body.nfc2
        };
    }
}

// Add Contract Controller for contract status endpoint
@ApiTags('合约状态')
@Controller('api/contract')
export class ContractController {
    constructor(private readonly nfcService: NFCService) { }

    @Get('status')
    @ApiOperation({
        summary: '获取合约状态',
        description: '检查所有智能合约的连接状态和网络信息',
    })
    @ApiResponse({
        status: 200,
        description: '成功获取合约状态',
        schema: {
            type: 'object',
            properties: {
                nfcRegistry: {
                    type: 'boolean',
                    description: 'NFC注册表合约状态',
                    example: true,
                },
                domainNFT: {
                    type: 'boolean',
                    description: '域名NFT合约状态',
                    example: true,
                },
                catNFT: {
                    type: 'boolean',
                    description: '小猫NFT合约状态',
                    example: true,
                },
                networkInfo: {
                    type: 'object',
                    description: '网络信息',
                    properties: {
                        network: {
                            type: 'string',
                            example: 'TestnetSentry',
                        },
                        chainId: {
                            type: 'string',
                            example: 'injective-888',
                        },
                        rpcUrl: {
                            type: 'string',
                            example: 'https://testnet.sentry.grpc.injective.network:443',
                        },
                        restUrl: {
                            type: 'string',
                            example: 'https://testnet.sentry.rest.injective.network',
                        },
                    },
                },
            },
        },
    })
    async getContractStatus() {
        return this.nfcService.getContractStatus();
    }
}