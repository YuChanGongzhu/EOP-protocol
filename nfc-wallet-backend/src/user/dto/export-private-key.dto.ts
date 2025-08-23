import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Length } from 'class-validator';

export class ExportPrivateKeyDto {
    @ApiProperty({
        description: 'NFC卡片的唯一标识符',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    uid: string;
}

export class PrivateKeyResponseDto {
    @ApiProperty({
        description: '用户地址',
        example: 'inj1xwve656jwedjne0dtars3m406g2zh92uqpmkfs'
    })
    address: string;

    @ApiProperty({
        description: '私钥（十六进制格式）',
        example: '0x1234567890abcdef...'
    })
    privateKey: string;

    @ApiProperty({
        description: '导出时间',
        example: '2023-01-01T00:00:00.000Z'
    })
    exportedAt: Date;

    @ApiProperty({
        description: '安全警告',
        example: '请妥善保管您的私钥，不要与任何人分享'
    })
    warning: string;
} 