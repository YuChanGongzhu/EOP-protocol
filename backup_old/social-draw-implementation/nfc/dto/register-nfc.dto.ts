import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class RegisterNFCDto {
    @ApiProperty({
        description: 'NFC卡片的唯一标识符',
        example: '04:1a:2b:3c:4d:5e:6f',
        minLength: 1,
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    uid: string;

    @ApiProperty({
        description: '要绑定到的现有用户地址（可选，如果不提供则创建新用户）',
        example: 'inj1xwve656jwedjne0dtars3m406g2zh92uqpmkfs',
        required: false
    })
    @IsString()
    @IsOptional()
    userAddress?: string;

    @ApiProperty({
        description: 'NFC卡片昵称（可选）',
        example: '我的主卡',
        required: false
    })
    @IsString()
    @IsOptional()
    nickname?: string;
}

export class BindNFCDto {
    @ApiProperty({
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f'
    })
    @IsString()
    @IsNotEmpty()
    uid: string;

    @ApiProperty({
        description: '用户Injective地址',
        example: 'inj1xwve656jwedjne0dtars3m406g2zh92uqpmkfs'
    })
    @IsString()
    @IsNotEmpty()
    userAddress: string;

    @ApiProperty({
        description: 'NFC卡片昵称（可选）',
        example: '工作卡',
        required: false
    })
    @IsString()
    @IsOptional()
    nickname?: string;
} 