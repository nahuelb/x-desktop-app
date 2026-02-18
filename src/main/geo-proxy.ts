import { createServer, type Server, type Socket } from "node:net";
import { powerMonitor, type Session } from "electron";
import { Client as SSHClient } from "ssh2";

let sshClient: InstanceType<typeof SSHClient> | null = null;
let socksServer: Server | null = null;
let proxyConnected = false;

let savedSession: Session | null = null;
let savedHost = "";
let savedUsername = "";
let reconnecting = false;

export function isProxyConnected(): boolean {
  return proxyConnected;
}

function handleSocksConnection(
  socket: Socket,
  ssh: InstanceType<typeof SSHClient>
) {
  socket.once("data", (greetingRaw) => {
    const greeting = Buffer.from(greetingRaw);
    if (greeting[0] !== 0x05) {
      return socket.destroy();
    }
    socket.write(Buffer.from([0x05, 0x00]));

    socket.once("data", (requestRaw) => {
      const req = Buffer.from(requestRaw);
      if (req[0] !== 0x05 || req[1] !== 0x01) {
        return socket.destroy();
      }

      const atyp = req[3];
      let host: string;
      let portOffset: number;

      if (atyp === 0x01) {
        host = `${req[4]}.${req[5]}.${req[6]}.${req[7]}`;
        portOffset = 8;
      } else if (atyp === 0x03) {
        const len = req[4];
        host = req.subarray(5, 5 + len).toString();
        portOffset = 5 + len;
      } else if (atyp === 0x04) {
        const parts: string[] = [];
        for (let i = 0; i < 16; i += 2) {
          parts.push(req.readUInt16BE(4 + i).toString(16));
        }
        host = parts.join(":");
        portOffset = 20;
      } else {
        return socket.destroy();
      }

      const port = req.readUInt16BE(portOffset);

      try {
        ssh.forwardOut("127.0.0.1", 0, host, port, (err, channel) => {
          if (err || !channel) {
            const reply = Buffer.from(req);
            reply[1] = 0x05;
            socket.end(reply);
            return;
          }
          const reply = Buffer.alloc(req.length);
          req.copy(reply);
          reply[1] = 0x00;
          socket.write(reply);

          channel.pipe(socket);
          socket.pipe(channel);

          channel.on("close", () => socket.destroy());
          socket.on("close", () => channel.destroy());
        });
      } catch {
        socket.destroy();
      }
    });
  });

  socket.on("error", () => socket.destroy());
}

export function initGeoProxy(
  twitterSession: Session,
  host: string,
  username: string
): Promise<void> {
  if (!(host && username)) {
    return Promise.reject(
      new Error("SSH_HOST and SSH_USER not configured, skipping proxy")
    );
  }

  savedSession = twitterSession;
  savedHost = host;
  savedUsername = username;

  return new Promise((resolveInit, reject) => {
    const ssh = new SSHClient();
    sshClient = ssh;

    ssh.on("ready", () => {
      proxyConnected = true;
      console.log(`[geo-proxy] SSH connected to ${host}`);

      const server = createServer((socket) =>
        handleSocksConnection(socket, ssh)
      );
      socksServer = server;

      server.listen(0, "127.0.0.1", async () => {
        const addr = server.address();
        if (!addr || typeof addr === "string") {
          return reject(new Error("Failed to bind SOCKS server"));
        }

        const port = addr.port;
        console.log(`[geo-proxy] SOCKS5 proxy listening on 127.0.0.1:${port}`);

        await twitterSession.setProxy({
          proxyRules: `socks5://127.0.0.1:${port}`,
        });
        console.log("[geo-proxy] Twitter session proxy configured");
        resolveInit();
      });

      server.on("error", reject);
    });

    ssh.on("close", () => {
      proxyConnected = false;
      console.log("[geo-proxy] SSH connection closed");
    });

    ssh.on("error", (err) => {
      proxyConnected = false;
      console.error("[geo-proxy] SSH error:", err.message);
      reject(err);
    });

    ssh.connect({
      host,
      port: 22,
      username,
      agent: process.env.SSH_AUTH_SOCK,
    });
  });
}

export function testSshConnection(
  host: string,
  username: string
): Promise<{ latencyMs: number }> {
  if (!(host && username)) {
    return Promise.reject(new Error("SSH host and user are required"));
  }

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const ssh = new SSHClient();

    const timeout = setTimeout(() => {
      ssh.end();
      reject(new Error("Connection timed out after 10s"));
    }, 10_000);

    ssh.on("ready", () => {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      ssh.end();
      resolve({ latencyMs });
    });

    ssh.on("error", (err) => {
      clearTimeout(timeout);
      reject(new Error(friendlySshError(err)));
    });

    ssh.connect({
      host,
      port: 22,
      username,
      agent: process.env.SSH_AUTH_SOCK,
    });
  });
}

function friendlySshError(err: Error): string {
  const msg = err.message;
  if (msg.includes("authentication methods failed")) {
    return "Authentication failed — check SSH key and username";
  }
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
    return "Host not found — check the SSH host address";
  }
  if (msg.includes("ECONNREFUSED")) {
    return "Connection refused — host is not accepting SSH connections";
  }
  if (msg.includes("ETIMEDOUT") || msg.includes("EHOSTUNREACH")) {
    return "Host unreachable — check the SSH host address";
  }
  return msg;
}

async function reconnect(): Promise<void> {
  if (reconnecting || !savedSession || !savedHost || !savedUsername) {
    return;
  }
  reconnecting = true;
  try {
    await destroyGeoProxy();
    await initGeoProxy(savedSession, savedHost, savedUsername);
    console.log("[geo-proxy] Reconnected after resume");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[geo-proxy] Reconnect failed:", msg);
  } finally {
    reconnecting = false;
  }
}

powerMonitor.on("resume", () => {
  if (savedSession && savedHost && savedUsername) {
    console.log("[geo-proxy] System resumed, reconnecting SSH tunnel…");
    reconnect();
  }
});

export async function destroyGeoProxy(twitterSession?: Session): Promise<void> {
  socksServer?.close();
  socksServer = null;
  sshClient?.end();
  sshClient = null;
  proxyConnected = false;
  if (twitterSession) {
    await twitterSession.setProxy({ proxyRules: "direct://" });
  }
  console.log("[geo-proxy] Cleaned up");
}
