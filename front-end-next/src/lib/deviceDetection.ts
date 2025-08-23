// 设备检测工具函数
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android/.test(navigator.userAgent);
}

export function isMac(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Mac/.test(navigator.userAgent) && !/iPad|iPhone|iPod/.test(navigator.userAgent);
}

// 检测是否支持Passkey
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  if (!window.PublicKeyCredential) return false;
  
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

// 获取Relying Party ID
export function getRpId(): string {
  if (typeof window === 'undefined') return 'localhost';
  
  const host = window.location.host;
  // 如果是 localhost 或 IP 地址，返回 localhost
  if (host.startsWith("localhost") || host.includes("127.0.0.1") || host.includes("192.168.") || host.includes("10.")) {
    return "localhost";
  }
  // 如果是 IP 地址 (简单判断)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host)) {
    return "localhost";
  }
  // 其他情况返回实际域名
  return host;
}
