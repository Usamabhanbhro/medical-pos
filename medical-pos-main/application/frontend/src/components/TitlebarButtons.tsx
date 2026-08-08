export default function TitlebarButtons() {
  const call = async (channel: string) => {
    try {
      await window.api?.invoke?.(channel);
    } catch (err) {
      console.error('IPC call failed', channel, err);
    }
  };

  return (
  <div className="titlebar-buttons flex items-center gap-2 mr-4">
      <button
        aria-label="Minimize"
        className="no-drag-btn px-3 py-1 rounded hover:bg-gray-200 hover:text-gray-800 transition-transform transform hover:scale-105 focus:outline-none"
        onClick={() => call('minimize-window')}
      >
        ─
      </button>

      <button
        aria-label="Maximize"
        className="no-drag-btn px-3 py-1 rounded hover:bg-gray-200 hover:text-gray-800 transition-transform transform hover:scale-105 focus:outline-none"
        onClick={() => call('maximize-window')}
      >
        ☐
      </button>

      <button
        aria-label="Close"
        className="no-drag-btn px-3 py-1 rounded text-red-600 hover:bg-red-100 hover:text-red-800 transition-transform transform hover:scale-105 focus:outline-none"
        onClick={() => call('close-window')}
      >
        ✕
      </button>
    </div>
  );
}
