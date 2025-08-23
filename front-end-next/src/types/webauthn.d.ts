// WebAuthn API 类型定义
declare global {
  interface Window {
    PublicKeyCredential: typeof PublicKeyCredential;
  }
}

export {};
