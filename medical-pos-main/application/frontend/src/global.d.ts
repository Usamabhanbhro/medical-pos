// TypeScript global declaration for Electron preload API
interface Window {
  api: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
    printReceipt: (htmlContent: string) => void;
  };
}
