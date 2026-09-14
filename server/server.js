const http = require("http");
const WebSocket = require("ws");

// Render provides the public port through PORT.
// Locally, fall back to 8080.
const PORT = Number(process.env.PORT || 8080);

const httpServer = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/health") {
        res.writeHead(200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        });
        res.end(JSON.stringify({
            status: "ok",
            service: "video-sync-server",
            time: Date.now()
        }));
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json"
    });
    res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocket.Server({
    server: httpServer
});

const rooms = new Map();

console.log(`Video Sync Server running on port ${PORT}`);

function send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function broadcast(room, sender, message) {
    const clients = rooms.get(room);
    if (!clients) return;

    for (const client of clients) {
        if (
            client !== sender &&
            client.readyState === WebSocket.OPEN
        ) {
            send(client, message);
        }
    }
}

function removeFromRoom(ws, notifyPeer = true) {
    if (!ws.room) return;

    const room = ws.room;
    const clients = rooms.get(room);

    if (!clients) {
        ws.room = null;
        ws.role = null;
        return;
    }

    clients.delete(ws);

    if (notifyPeer) {
        broadcast(room, ws, {
            type: "peer-left"
        });
    }

    if (clients.size === 0) {
        rooms.delete(room);
        console.log(`Room deleted: ${room}`);
    }

    ws.room = null;
    ws.role = null;
}

wss.on("connection", (ws) => {
    console.log("Computer connected");

    ws.room = null;
    ws.role = null;
    ws.isAlive = true;

    ws.on("pong", () => {
        ws.isAlive = true;
    });

    send(ws, {
        type: "connected"
    });

    ws.on("message", (raw) => {
        try {
            const message = JSON.parse(raw.toString());

            console.log("Received:", message);

            if (message.type === "create-room") {
                const room = String(message.room || "")
                    .trim()
                    .toUpperCase();

                if (!room) {
                    send(ws, {
                        type: "error",
                        message: "Invalid room code"
                    });
                    return;
                }

                if (ws.room) {
                    removeFromRoom(ws);
                }

                if (rooms.has(room)) {
                    send(ws, {
                        type: "error",
                        message: "Room already exists"
                    });
                    return;
                }

                const clients = new Set();
                rooms.set(room, clients);

                ws.room = room;
                ws.role = "master";
                clients.add(ws);

                send(ws, {
                    type: "room-created",
                    room,
                    role: "master"
                });

                console.log(`Room created: ${room}`);
                return;
            }

            if (message.type === "join-room") {
                const room = String(message.room || "")
                    .trim()
                    .toUpperCase();

                if (!rooms.has(room)) {
                    send(ws, {
                        type: "error",
                        message: "Room does not exist"
                    });
                    return;
                }

                const clients = rooms.get(room);

                if (clients.size >= 2) {
                    send(ws, {
                        type: "error",
                        message: "Room is full"
                    });
                    return;
                }

                if (ws.room) {
                    removeFromRoom(ws);
                }

                ws.room = room;
                ws.role = "client";
                clients.add(ws);

                send(ws, {
                    type: "room-joined",
                    room,
                    role: "client"
                });

                broadcast(room, ws, {
                    type: "peer-joined"
                });

                console.log(`Computer joined room: ${room}`);
                return;
            }

            if (message.type === "leave-room") {
                console.log(`Computer leaving room: ${ws.room}`);
                removeFromRoom(ws, true);
                send(ws, {
                    type: "session-left"
                });
                return;
            }

            if (message.type === "clock-ping") {
                send(ws, {
                    type: "clock-pong",
                    clientTime: message.clientTime,
                    serverTime: Date.now()
                });
                return;
            }

            if (message.type === "sync") {
                if (!ws.room) return;

                broadcast(ws.room, ws, {
                    type: "sync",
                    action: message.action || "state",
                    time: message.time,
                    playing: message.playing,
                    playbackRate: message.playbackRate,
                    serverTime: Date.now(),
                    senderRole: ws.role
                });

                console.log(`Sync from ${ws.role}:`, {
                    room: ws.room,
                    time: message.time,
                    playing: message.playing
                });
            }
        } catch (error) {
            console.error("Invalid message:", error);
        }
    });

    ws.on("close", () => {
        console.log("Computer disconnected");
        removeFromRoom(ws, true);
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error);
    });
});

// Keep long-lived connections healthy on hosted infrastructure.
const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
        if (ws.isAlive === false) {
            ws.terminate();
            continue;
        }

        ws.isAlive = false;
        ws.ping();
    }
}, 30000);

wss.on("close", () => {
    clearInterval(heartbeat);
});

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Listening on 0.0.0.0:${PORT}`);
});

function shutdown() {
    console.log("Shutting down server...");

    for (const ws of wss.clients) {
        ws.close(1001, "Server shutting down");
    }

    wss.close(() => {
        httpServer.close(() => {
            process.exit(0);
        });
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
