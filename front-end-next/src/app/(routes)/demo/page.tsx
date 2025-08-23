import NfcRegisterForm from '@/components/NfcRegisterForm';
import SocialInteractionForm from '@/components/SocialInteractionForm';
import DrawWithTicketsForm from '@/components/DrawWithTicketsForm';
import DomainRegisterForm from '@/components/DomainRegisterForm';
import type { WalletResponse, SocialInteractionResp, CatNFT } from '@/types/nfc';

export default function DemoPage() {
    return (
        <main className="max-w-2xl mx-auto p-6 space-y-8">
            <section>
                <h2 className="text-lg font-semibold">1) 注册 NFC</h2>
                <NfcRegisterForm onRegistered={(res: WalletResponse) => console.log('Registered:', res)} />
            </section>

            <section>
                <h2 className="text-lg font-semibold">2) 社交互动（获取抽卡券）</h2>
                <SocialInteractionForm onSuccess={(res: SocialInteractionResp) => console.log('Social ok:', res)} />
            </section>

            <section>
                <h2 className="text-lg font-semibold">3) 用券抽卡</h2>
                <DrawWithTicketsForm onDrawn={(cat: CatNFT) => console.log('Drawn:', cat)} />
            </section>

            <section>
                <h2 className="text-lg font-semibold">4) 注册域名</h2>
                <DomainRegisterForm />
            </section>
        </main>
    );
}
