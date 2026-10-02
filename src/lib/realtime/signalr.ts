import { type HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";

export type SignalRStatus = HubConnectionState;

let connection: HubConnection | null = null;
let startPromise: Promise<void> | null = null;

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6789/";
}

export function getHubUrl(): string {
  return new URL("/hubs/app", getBaseUrl()).toString();
}

export function getHubConnection(): HubConnection {
  if (typeof window === "undefined") throw new Error("SignalR chỉ chạy trên browser");
  if (connection) return connection;

  connection = new HubConnectionBuilder()
    .withUrl(getHubUrl(), { withCredentials: true })
    .withAutomaticReconnect()
    .configureLogging(process.env.NODE_ENV === "development" ? LogLevel.Information : LogLevel.Warning)
    .build();

  connection.onreconnecting((err) => console.info("[SignalR] reconnecting...", err));
  connection.onreconnected((id) => console.info("[SignalR] reconnected:", id));
  connection.onclose((err) => console.info("[SignalR] closed", err));

  return connection;
}

export async function startHubConnection(): Promise<HubConnection> {
  const conn = getHubConnection();
  if (conn.state === HubConnectionState.Connected) return conn;

  if (conn.state === HubConnectionState.Connecting && startPromise !== null) {
    await startPromise;
    return conn;
  }

  startPromise = conn
    .start()
    .then(() => {
      startPromise = null;
    })
    .catch((err) => {
      startPromise = null;
      throw err;
    });

  await startPromise;
  return conn;
}

export async function stopHubConnection(): Promise<void> {
  if (!connection) return;
  try {
    await connection.stop();
  } finally {
    connection = null;
  }
}
