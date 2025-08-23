import { getRpId } from './deviceDetection';

export interface PasskeyResult {
  success: boolean;
  keyId?: string;
  username?: string;
  error?: string;
}

export interface PasskeySignatureResult {
  success: boolean;
  signature?: ArrayBuffer;
  authenticatorData?: number[];
  clientDataJSON?: ArrayBuffer;
  username?: string;
  error?: string;
}

// 存储公钥
function storePublicKey(keyId: string, publicKey: ArrayBuffer): void {
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
  const storedKeys = localStorage.getItem('storedPublicKeys') ? 
    JSON.parse(localStorage.getItem('storedPublicKeys')!) : {};
  
  storedKeys[keyId] = publicKeyBase64;
  localStorage.setItem('storedPublicKeys', JSON.stringify(storedKeys));
}

// 创建Passkey
export async function createPasskey(username: string): Promise<PasskeyResult> {
  try {
    // 检查是否支持Passkey
    if (!window.PublicKeyCredential) {
      return { success: false, error: '浏览器不支持Passkey' };
    }

    // 检查是否支持平台认证器
    const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!isAvailable) {
      return { success: false, error: '设备不支持Passkey' };
    }

    const rpId = getRpId();
    console.log('Using RP ID:', rpId);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: new TextEncoder().encode(crypto.randomUUID()),
      rp: {
        id: rpId,
        name: "Injective Pass",
      },
      timeout: 60_000,
      user: {
        id: new TextEncoder().encode(crypto.randomUUID()),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      }
    };

    console.log('Creating passkey with options:', publicKey);

    const credential = await navigator.credentials.create({ publicKey });
    const pubKeyCredential = credential as PublicKeyCredential;
    const response = pubKeyCredential.response as AuthenticatorAttestationResponse;
    
    const { id } = pubKeyCredential;
    const pubKey = response.getPublicKey();

    if (!pubKey) {
      return { success: false, error: '无法获取公钥' };
    }

    // 存储公钥
    storePublicKey(id, pubKey);

    // 存储用户名映射
    const publicKeyMap = localStorage.getItem('publicKeyMap') ? 
      JSON.parse(localStorage.getItem('publicKeyMap')!) : {};
    localStorage.setItem('publicKeyMap', JSON.stringify({
      ...publicKeyMap,
      [id]: username
    }));

    console.log('Passkey created successfully:', { id, username });
    return { success: true, keyId: id, username };
  } catch (error: any) {
    console.error('Passkey creation failed:', error);

    // 提供更友好的错误信息
    let errorMessage = error.message;
    if (error.name === 'InvalidStateError') {
      errorMessage = 'Passkey已存在，请使用现有Passkey登录';
    } else if (error.name === 'NotAllowedError') {
      errorMessage = '用户取消了Passkey创建';
    } else if (error.name === 'SecurityError') {
      errorMessage = '安全错误，请确保使用HTTPS或localhost';
    } else if (error.message.includes('invalid domain')) {
      errorMessage = '域名无效，请确保使用有效的域名或localhost';
    }

    return { success: false, error: errorMessage };
  }
}

// 获取Passkey签名
export async function getPasskeySignature(): Promise<PasskeySignatureResult> {
  try {
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: new TextEncoder().encode("Login to Injective Pass"),
      timeout: 60_000,
      userVerification: "required"
    };

    const credential = await navigator.credentials.get({ publicKey });
    const pubKeyCredential = credential as PublicKeyCredential;
    const response = pubKeyCredential.response as AuthenticatorAssertionResponse;
    
    const { signature, authenticatorData, clientDataJSON } = response;
    
    // 获取用户名
    const publicKeyMap = localStorage.getItem('publicKeyMap') ? 
      JSON.parse(localStorage.getItem('publicKeyMap')!) : {};
    const username = publicKeyMap[pubKeyCredential.id] || 'Unknown User';

    return {
      success: true,
      signature,
      authenticatorData: Array.from(new Uint8Array(authenticatorData)),
      clientDataJSON,
      username
    };
  } catch (error: any) {
    console.error('Passkey authentication failed:', error);
    return { success: false, error: error.message };
  }
}

// 检查是否已有Passkey
export function hasExistingPasskey(): boolean {
  const publicKeyMap = localStorage.getItem('publicKeyMap');
  if (!publicKeyMap) return false;
  
  const keys = JSON.parse(publicKeyMap);
  return Object.keys(keys).length > 0;
}
