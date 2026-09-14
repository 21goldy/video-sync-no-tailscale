# Video Sync — No Tailscale Setup

This version removes the Tailscale dependency.

## Architecture

Computer A ─┐
            ├── WSS → public Video Sync server ← WSS ── Computer B
Computer B ─┘

The video files stay on the two computers. Only room, clock and playback-state messages travel through the server.

## Recommended hosting: Render

Render Web Services support inbound WebSocket connections from the public internet. Public clients should use `wss://`.

### 1. Create the server

The `server/` folder contains the Node.js WebSocket server.

You can deploy it as a Render Web Service.

If using the included `render.yaml`, the important settings are:

- Runtime: Node
- Root directory: `server`
- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/health`

After deployment, Render gives you a URL similar to:

`https://your-service-name.onrender.com`

The WebSocket URL is:

`wss://your-service-name.onrender.com`

### 2. Change the extension server URL

Open:

`extension/background.js`

Find:

```js
const SERVER_URL =
    "wss://YOUR-SERVICE-NAME.onrender.com";
```

Replace it with your actual Render WebSocket URL.

Example:

```js
const SERVER_URL =
    "wss://video-sync-server-xxxx.onrender.com";
```

### 3. Reload the extension

Go to `chrome://extensions` → Developer mode → Reload Video Sync.

Do this on both computers.

### 4. Test

1. Computer A opens the local video.
2. Create a session.
3. Computer B opens the same local video.
4. Enter the room code.
5. Both extensions should show `Connected to sync server`.
6. Play/pause/sync from either computer.

## Local development without Tailscale

If both computers are on the same Wi-Fi/LAN, you can also use Computer A's local IP instead of a public server:

```js
const SERVER_URL =
    "ws://192.168.1.123:8080";
```

Replace the IP with Computer A's LAN IP and allow port 8080 through the firewall.

This LAN method only works while both computers can reach Computer A directly. The Render method works across different networks.

## Important production note

The current room state is stored in server memory. That is fine for the two-computer MVP, but if the hosted server restarts, active rooms disappear. Later, move room/session state to Redis/Render Key Value or another shared store if you scale beyond one server instance.
