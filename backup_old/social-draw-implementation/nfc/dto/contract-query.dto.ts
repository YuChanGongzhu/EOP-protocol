import { ApiProperty } from '@nestjs/swagger';

export class ContractStatusDto {
    @ApiProperty({
        description: 'NFCWalletRegistry 合约状态',
        example: true,
    })
    nfcRegistry: boolean;

    @ApiProperty({
        description: 'INJDomainNFT 合约状态',
        example: true,
    })
    domainNFT: boolean;

    @ApiProperty({
        description: 'CatNFT 合约状态',
        example: true,
    })
    catNFT: boolean;

    @ApiProperty({
        description: '网络信息',
        example: {
            network: 'TestnetSentry',
            chainId: 'injective-888',
            rpcUrl: 'https://k8s.testnet.json-rpc.injective.network/',
            restUrl: 'https://k8s.testnet.tm.injective.network/'
        },
    })
    networkInfo: {
        network: string;
        chainId: string;
        rpcUrl: string;
        restUrl: string;
    };
}

export class DomainAvailabilityCheckDto {
    @ApiProperty({
        description: '域名前缀',
        example: 'alice',
    })
    domainPrefix: string;
}

export class CatNameAvailabilityCheckDto {
    @ApiProperty({
        description: '小猫名称',
        example: 'Lucky Cat',
    })
    catName: string;
}

export class AvailabilityResponseDto {
    @ApiProperty({
        description: '是否可用',
        example: true,
    })
    available: boolean;

    @ApiProperty({
        description: '检查的名称',
        example: 'alice.inj',
    })
    name: string;

    @ApiProperty({
        description: '当前所有者地址（如果已被占用）',
        example: 'inj1abc123...',
        required: false,
    })
    ownerAddress?: string;
}

export class UserNFTInfoDto {
    @ApiProperty({
        description: '用户域名信息',
        example: {
            hasDomain: true,
            domain: 'alice.inj',
            tokenId: '1'
        },
        required: false,
    })
    domainInfo?: {
        hasDomain: boolean;
        domain?: string;
        tokenId?: string;
    };

    @ApiProperty({
        description: '用户小猫NFT列表',
        example: {
            cats: [
                {
                    tokenId: '1',
                    name: 'Lucky Cat',
                    rarity: 'SR',
                    color: 'green',
                    mintedAt: '2023-01-01T00:00:00.000Z'
                }
            ],
            total: 1
        },
    })
    catInfo: {
        cats: Array<{
            tokenId: string;
            name: string;
            rarity: string;
            color: string;
            mintedAt: string;
        }>;
        total: number;
    };
}
