import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class RegisterNFCDto {
    @ApiProperty({
        description: 'NFC卡片的唯一标识符，支持十六进制格式，可以使用冒号分隔',
        example: '04:1a:2b:3c:4d:5e:6f',
        minLength: 1,
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    uid: string;

    @ApiProperty({
        description: '用户Injective地址（可选，如果提供则绑定到现有用户）',
        example: 'inj1xwve656jwedjne0dtars3m406g2zh92uqpmkfs',
        required: false,
    })
    @IsString()
    @IsOptional()
    userAddress?: string;

    @ApiProperty({
        description: '卡片持有者姓名（可选）',
        example: 'Alice',
        required: false,
        minLength: 1,
        maxLength: 50,
    })
    @IsString()
    @IsOptional()
    @Length(1, 50)
    ownerName?: string;

    @ApiProperty({
        description: 'NFC卡片昵称（可选）',
        example: '我的主卡',
        required: false,
        minLength: 1,
        maxLength: 100,
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