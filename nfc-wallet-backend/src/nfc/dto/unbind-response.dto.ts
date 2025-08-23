import { ApiProperty } from '@nestjs/swagger';

export class UnbindResponseDto {
    @ApiProperty({ example: true, description: '解绑是否成功' })
    success: boolean;

    @ApiProperty({ example: 'NFC解绑成功', description: '操作结果消息' })
    message: string;

    @ApiProperty({
        example: '0x1234...abcd',
        description: '解绑交易哈希',
        required: false
    })
    txHash?: string;

    @ApiProperty({
        example: 'ERROR_MESSAGE',
        description: '错误信息',
        required: false
    })
    error?: string;
}
