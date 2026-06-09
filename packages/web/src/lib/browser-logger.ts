type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

const endpoint = '/__mls/browser-log';

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function send(type: string, details: Record<string, unknown>): void {
  const payload = JSON.stringify({
    clientTime: new Date().toISOString(),
    type,
    url: window.location.href,
    ...details,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
}

export function installBrowserLogger(): void {
  if (!import.meta.env.DEV) return;

  const levels: LogLevel[] = ['debug', 'info', 'log', 'warn', 'error'];
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      send('console', { level, args: args.map(serialize) });
    };
  }

  window.addEventListener('error', (event) => {
    send('error', {
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      error: serialize(event.error),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    send('unhandledrejection', { reason: serialize(event.reason) });
  });

  send('lifecycle', { event: 'logger-installed', userAgent: navigator.userAgent });
}
