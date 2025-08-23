import {
  Controller,
  Put,
  Get,
  Delete,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { ExportPrivateKeyDto, PrivateKeyResponseDto } from './dto/export-private-key.dto';

@ApiTags('用户管理')
@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Put('domain')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新.inj域名',
    description: '为指定的NFC UID设置自定义.inj域名，域名必须唯一',
  })
  @ApiResponse({
    status: 200,
    description: '成功更新.inj域名',
    type: UserProfileDto,
  })
  @ApiBadRequestResponse({
    description: '域名前缀格式无效',
  })
  @ApiConflictResponse({
    description: '该.inj域名已被占用',
  })
  @ApiNotFoundResponse({
    description: '未找到对应的钱包',
  })
  async updateDomain(@Body() updateDomainDto: UpdateDomainDto): Promise<UserProfileDto> {
    return this.userService.updateDomain(updateDomainDto);
  }

  @Get('profile/:uid')
  @ApiOperation({
    summary: '获取用户资料',
    description: '根据NFC UID获取用户的详细资料',
  })
  @ApiParam({
    name: 'uid',
    description: 'NFC卡片UID',
    example: '04:1a:2b:3c:4d:5e:6f',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取用户资料',
    type: UserProfileDto,
  })
  @ApiNotFoundResponse({
    description: '未找到对应的用户',
  })
  async getUserProfile(@Param('uid') uid: string): Promise<UserProfileDto> {
    return this.userService.getUserProfile(uid);
  }

  @Get('check-domain/:domainPrefix')
  @ApiOperation({
    summary: '检查.inj域名可用性',
    description: '检查指定的.inj域名前缀是否可用',
  })
  @ApiParam({
    name: 'domainPrefix',
    description: '要检查的域名前缀（不包含.inj后缀）',
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
      },
    },
  })
  @ApiBadRequestResponse({
    description: '域名前缀格式无效',
  })
  async checkDomainAvailability(@Param('domainPrefix') domainPrefix: string) {
    return this.userService.checkDomainAvailability(domainPrefix);
  }

  @Delete('domain/:uid')
  @ApiOperation({
    summary: '删除.inj域名',
    description: '删除指定UID的.inj域名',
  })
  @ApiParam({
    name: 'uid',
    description: 'NFC卡片UID',
    example: '04:1a:2b:3c:4d:5e:6f',
  })
  @ApiResponse({
    status: 200,
    description: '成功删除.inj域名',
    type: UserProfileDto,
  })
  @ApiNotFoundResponse({
    description: '未找到对应的钱包',
  })
  async removeDomain(@Param('uid') uid: string): Promise<UserProfileDto> {
    return this.userService.removeDomain(uid);
  }

  @Get('search/:domain')
  @ApiOperation({
    summary: '根据.inj域名查找用户',
    description: '通过.inj域名查找对应的用户信息',
  })
  @ApiParam({
    name: 'domain',
    description: '.inj域名',
    example: 'alice.inj',
  })
  @ApiResponse({
    status: 200,
    description: '成功找到用户',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: '未找到对应的用户',
  })
  async getUserByDomain(@Param('domain') domain: string): Promise<UserProfileDto | null> {
    return this.userService.getUserByDomain(domain);
  }

  @Get('list')
  @ApiOperation({
    summary: '获取用户列表',
    description: '获取分页的用户列表',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取用户列表',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserProfileDto' },
        },
        total: {
          type: 'number',
          description: '总用户数',
          example: 100,
        },
        page: {
          type: 'number',
          description: '当前页码',
          example: 1,
        },
        totalPages: {
          type: 'number',
          description: '总页数',
          example: 5,
        },
      },
    },
  })
  async getUserList(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.userService.getUserList(page || 1, limit || 20);
  }

  @Post('export-private-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '导出用户私钥',
    description: '导出指定NFC卡片对应的用户私钥。此操作存在安全风险，请谨慎使用。',
  })
  @ApiResponse({
    status: 200,
    description: '成功导出私钥',
    type: PrivateKeyResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数无效或私钥解密失败',
  })
  @ApiNotFoundResponse({
    description: '未找到对应的NFC卡片',
  })
  async exportPrivateKey(@Body() exportPrivateKeyDto: ExportPrivateKeyDto): Promise<PrivateKeyResponseDto> {
    return this.userService.exportPrivateKey(exportPrivateKeyDto);
  }
} 