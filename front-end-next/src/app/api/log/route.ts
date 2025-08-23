import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const level = body?.level || 'info';
        const msg = body?.message || '';
        const data = body?.data;
        const time = body?.ts || new Date().toISOString();
        const path = body?.path || '';
        const prefix = `[EOP][client]->[server] ${time} ${path}`;
        // 在服务器终端输出
        switch (level) {
            case 'debug':
                console.debug(prefix, msg, data);
                break;
            case 'warn':
                console.warn(prefix, msg, data);
                break;
            case 'error':
                console.error(prefix, msg, data);
                break;
            default:
                console.info(prefix, msg, data);
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (e) {
        console.error('[EOP][log api] failed', e);
        return new Response(JSON.stringify({ ok: false }), { status: 500 });
    }
}


