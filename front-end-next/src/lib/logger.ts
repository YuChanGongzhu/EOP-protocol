/*
 简单的前端日志工具：统一前缀与级别控制
 - 使用 NEXT_PUBLIC_LOG_LEVEL 控制等级：debug < info < warn < error
 - 默认 info
*/

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function currentLevel(): number {
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_LOG_LEVEL) {
        const lv = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';
        return LEVELS[lv] ?? LEVELS.info;
    }
    return LEVELS.info;
}

function ts(): string {
    try {
        return new Date().toISOString();
    } catch {
        return '';
    }
}

const PREFIX = '[EOP]';

export const Logger = {
    debug: (...args: unknown[]) => {
        if (currentLevel() <= LEVELS.debug) {
            console.debug(PREFIX, ts(), ...args);
            postToServer('debug', args);
        }
    },
    info: (...args: unknown[]) => {
        if (currentLevel() <= LEVELS.info) {
            console.info(PREFIX, ts(), ...args);
            postToServer('info', args);
        }
    },
    warn: (...args: unknown[]) => {
        if (currentLevel() <= LEVELS.warn) {
            console.warn(PREFIX, ts(), ...args);
            postToServer('warn', args);
        }
    },
    error: (...args: unknown[]) => {
        if (currentLevel() <= LEVELS.error) {
            console.error(PREFIX, ts(), ...args);
            postToServer('error', args);
        }
    },
    group: (label: string) => {
        if (currentLevel() <= LEVELS.debug) console.group(`${PREFIX} ${label}`);
    },
    groupEnd: () => {
        if (currentLevel() <= LEVELS.debug) console.groupEnd();
    },
};


function postToServer(level: LogLevel, args: unknown[]) {
    try {
        if (typeof window === 'undefined') return;
        const [message, data] = normalizeArgs(args);
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level,
                message,
                data,
                ts: ts(),
                path: window.location?.pathname || ''
            }),
            keepalive: true
        }).catch(() => { });
    } catch { }
}

function normalizeArgs(args: unknown[]): [string, unknown] {
    if (!args || args.length === 0) return ['', undefined];
    const first = args[0];
    const message = typeof first === 'string' ? first : JSON.stringify(first);
    const rest = args.length > 1 ? (args[1]) : undefined;
    return [message, rest];
}
