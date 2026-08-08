// TypeScript global declaration for Electron preload API
interface Window {
  api: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, listener: (...args: unknown[]) => void) => void;
    removeAllListeners: (channel: string) => void;
    printReceipt: (htmlContent: string) => void;
  };
}
