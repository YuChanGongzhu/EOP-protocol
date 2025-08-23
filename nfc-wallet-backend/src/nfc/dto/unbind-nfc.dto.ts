import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UnbindNFCDto {
    @ApiProperty({
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @IsString()
    @IsNotEmpty()
    uid: string;

    @ApiProperty({
        description: '是否重置为空白卡片状态',
        example: true,
        required: false,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    resetToBlank?: boolean = true;

    @ApiProperty({
        description: '钱包所有者签名（用于验证授权）',
        example: '0x...',
        required: false,
    })
    @IsString()
    @IsOptional()
    ownerSignature?: string;
} 