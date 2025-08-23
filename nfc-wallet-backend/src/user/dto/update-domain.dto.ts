import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class UpdateDomainDto {
    @ApiProperty({
        description: 'NFC卡片UID',
        example: '04:1a:2b:3c:4d:5e:6f',
    })
    @IsString()
    @IsNotEmpty()
    uid: string;

    @ApiProperty({
        description: '新的.inj域名前缀（不包含.inj后缀）',
        example: 'alice',
        minLength: 3,
        maxLength: 30,
    })
    @IsString()
    @IsNotEmpty()
    @Length(3, 30, { message: '域名前缀长度必须在3-30个字符之间' })
    @Matches(/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/, {
        message: '域名前缀只能包含小写字母、数字和连字符，且不能以连字符开头或结尾',
    })
    domainPrefix: string;
} 