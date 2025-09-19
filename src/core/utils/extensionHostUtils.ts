import * as net from 'net';

/**
 * Helper to check if a port is already in use.
 */
export function isPortInUse(port: number, timeoutMs = 300): Promise<boolean> {
  const host = '127.0.0.1';

  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ host, port });
    socket.unref(); // Exclude this socket from keeping the Node event loop alive

    const finish = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    // If we are able to connect, this means a server is listening at the port
    socket.once('connect', () => finish(true));

    // Any connection error means we couldn't reach a listener (not in use)
    socket.once('error', () => finish(false));

    // Give up after a short timeout (network hiccup, etc.)
    socket.setTimeout(timeoutMs, () => finish(false));
  });
}
