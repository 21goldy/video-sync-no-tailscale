# Video Sync 🎬

<p align="center">
  <strong>Real-time video playback synchronization across multiple computers.</strong>
</p>

<p align="center">
  WebSockets • JavaScript • Networking • Tailscale • Real-Time Systems • Cloud Deployment
</p>

---

## 📱 Overview

**Video Sync** is a real-time video synchronization system designed to keep video playback synchronized across multiple computers.

The project allows connected computers to coordinate playback actions such as:

- ▶️ Play
- ⏸️ Pause
- ⏩ Seeking
- 🕐 Playback timing
- 🔄 Synchronization of playback state

The system was built to explore **real-time communication, WebSockets, networking, playback synchronization, and distributed client coordination**.

Both connected computers operate as **equal peers**. The system does not rely on a permanent master/slave relationship between clients.

---

## ✨ Features

- 🎬 Synchronize video playback across multiple computers
- ▶️ Synchronize play actions
- ⏸️ Synchronize pause actions
- ⏩ Synchronize seeking
- 🕐 Synchronize playback position and timing
- 🔌 Real-time communication using WebSockets
- 🌐 Support for Tailscale-based networking
- 🌐 Support for networking without Tailscale
- 🔄 Synchronize connected clients in real time
- ☁️ Cloud/server deployment support
- 🖥️ Multi-computer playback coordination

---

## 🏗️ Architecture

Video Sync uses a real-time client-server communication model.

```text
                    ┌─────────────────────┐
                    │                     │
                    │   Sync Server       │
                    │   WebSocket Server  │
                    │                     │
                    └──────────┬──────────┘
                               │
                    WebSocket Connections
                         ┌─────┴─────┐
                         │           │
                         ▼           ▼
                ┌─────────────┐ ┌─────────────┐
                │  Computer A │ │  Computer B │
                │             │ │             │
                │ Video       │ │ Video       │
                │ Player      │ │ Player      │
                └─────────────┘ └─────────────┘
```

Each connected client communicates playback state through the synchronization server.

When a playback action occurs, the updated state is transmitted through WebSockets and applied by the other connected clients.

---

## 🔄 Synchronization Flow

A typical synchronization flow looks like:

```text
Computer A
    │
    │ Play / Pause / Seek
    ▼
WebSocket
    │
    ▼
Sync Server
    │
    │ Broadcast Playback State
    ▼
WebSocket
    │
    ▼
Computer B
    │
    ▼
Update Video Playback
```

The synchronization process can handle:

```text
Playback State
      │
      ├── Playing
      ├── Paused
      ├── Current Position
      ├── Seek Position
      └── Timing Information
```

---

## 🌐 Networking

The project was implemented with two networking approaches.

### Tailscale

The first approach uses **Tailscale** to establish connectivity between computers over a private network.

```text
Computer A
     │
     │ Tailscale Network
     │
     ▼
Sync Server
     │
     │ Tailscale Network
     │
     ▼
Computer B
```

This approach provides a straightforward way for connected computers to communicate without requiring traditional public network configuration.

### No-Tailscale Architecture

The project was also developed to support communication without depending on Tailscale.

```text
Computer A
     │
     │ WebSocket
     ▼
Public / Cloud Server
     │
     │ WebSocket
     ▼
Computer B
```

This approach allows clients to communicate through a remotely accessible synchronization server.

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend / Client** | JavaScript |
| **Communication** | WebSockets |
| **Networking** | Tailscale, Network Sockets |
| **Real-Time System** | WebSocket-based Synchronization |
| **Deployment** | Render / Cloud Deployment |
| **Media** | Video Playback |
| **Architecture** | Client-Server |

---

## 📂 Project Structure

```text
video-sync/
│
├── client/
│   ├── extension/
│   ├── player/
│   └── sync/
│
├── server/
│   ├── server.js
│   └── websocket/
│
├── public/
│
├── package.json
├── README.md
└── LICENSE
```

> The exact structure may vary depending on the current implementation.

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js
- npm
- A modern web browser
- Two or more computers for testing
- Network connectivity between clients

If using the Tailscale architecture:

- Tailscale installed on the participating computers
- A configured Tailscale network

---

## 📥 Installation

Clone the repository:

```bash
git clone https://github.com/21goldy/video-sync.git
```

Navigate to the project:

```bash
cd video-sync
```

Install dependencies:

```bash
npm install
```

---

## ▶️ Running the Server

Start the synchronization server:

```bash
node server.js
```

The server provides the WebSocket endpoint used by connected clients.

---

## 🔌 Connecting Clients

Once the server is running:

1. Open the client on the first computer.
2. Connect it to the synchronization server.
3. Open the client on the second computer.
4. Connect it to the same server.
5. Open the same video on both computers.
6. Perform playback actions from either client.
7. The connected clients synchronize their playback state.

---

## 🎬 Playback Synchronization

The system synchronizes important playback events between connected clients.

### Play

```text
Client A
   │
   │ PLAY
   ▼
Server
   │
   ▼
Client B
   │
   ▼
Start Playback
```

### Pause

```text
Client A
   │
   │ PAUSE
   ▼
Server
   │
   ▼
Client B
   │
   ▼
Pause Playback
```

### Seek

```text
Client A
   │
   │ SEEK → 01:25
   ▼
Server
   │
   ▼
Client B
   │
   ▼
Seek → 01:25
```

### Timing

Playback timing information can be exchanged between clients so that connected players can correct differences in their playback positions.

---

## 🧠 Synchronization Concept

The basic synchronization model is:

```text
Playback Event
      │
      ▼
Create Sync Message
      │
      ▼
Send Through WebSocket
      │
      ▼
Server Receives Event
      │
      ▼
Broadcast To Connected Clients
      │
      ▼
Clients Update Playback
      │
      ▼
Playback Re-synchronized
```

This allows the application to react to playback events in real time instead of relying on periodic polling.

---

## 🔌 WebSocket Communication

WebSockets provide a persistent communication channel between the clients and synchronization server.

Conceptually:

```text
Client A ────────┐
                 │
                 ▼
          WebSocket Server
                 ▲
                 │
Client B ────────┘
```

This allows playback events to be transmitted with low communication overhead and without repeatedly creating new HTTP requests.

---

## 🖥️ Multi-Computer Support

The system is designed around multiple connected clients.

For example:

```text
                 Sync Server
                 /    |    \
                /     |     \
               ▼      ▼      ▼
          Computer A Computer B Computer C
```

Each client can maintain its own video player while receiving synchronization events from the server.

---

## 🔐 Networking & Security

When deploying the synchronization server publicly:

- Use secure WebSocket connections where appropriate
- Protect the server from unauthorized connections
- Avoid exposing unnecessary ports
- Validate incoming WebSocket messages
- Handle disconnected clients
- Keep server dependencies updated
- Use appropriate authentication if the application is exposed publicly

For private environments, Tailscale can be used to provide network-level connectivity between participating machines.

---

## 🧪 Development

Install dependencies:

```bash
npm install
```

Run the server:

```bash
node server.js
```

For development, inspect browser console logs and server logs to debug:

- WebSocket connections
- Client registration
- Playback events
- Synchronization messages
- Connection failures
- Reconnection behavior

---

## 🗺️ Future Improvements

- [ ] Automatic video detection
- [ ] Automatic synchronization when a client joins
- [ ] Improved latency compensation
- [ ] More accurate playback drift correction
- [ ] Automatic reconnection
- [ ] Room-based synchronization
- [ ] Multiple synchronized rooms
- [ ] User authentication
- [ ] Persistent rooms
- [ ] Better client status indicators
- [ ] Connection health monitoring
- [ ] Improved error handling
- [ ] More playback controls
- [ ] Mobile browser support
- [ ] Improved synchronization accuracy

---

## 🎯 Project Goals

The main goals of Video Sync are:

1. Synchronize video playback across multiple computers.
2. Build a real-time communication system using WebSockets.
3. Understand synchronization between distributed clients.
4. Experiment with playback timing and drift correction.
5. Work with Tailscale-based private networking.
6. Develop an alternative networking architecture without Tailscale.
7. Deploy a real-time synchronization server.
8. Gain practical experience with distributed systems and networking.

---

## 📚 What I Learned

Building Video Sync provided hands-on experience with:

- WebSockets
- Real-time communication
- JavaScript
- Browser extensions
- Network programming
- Tailscale
- Client-server architecture
- Distributed systems
- Playback synchronization
- Timing and synchronization problems
- Cloud deployment
- Debugging real-time applications
- Handling multiple connected clients

---

## 🔭 High-Level Architecture

```text
┌────────────────────────────────────────────────────┐
│                  Synchronization Layer              │
│                                                    │
│                 WebSocket Server                   │
│                                                    │
└─────────────────────────┬──────────────────────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│       Computer A        │  │       Computer B        │
│                         │  │                         │
│    Video Player         │  │    Video Player         │
│                         │  │                         │
│  Play / Pause / Seek    │  │  Play / Pause / Seek    │
│  Playback Position      │  │  Playback Position      │
└─────────────────────────┘  └─────────────────────────┘
```

---

## 🌐 Networking Architecture

### With Tailscale

```text
┌──────────────┐
│  Computer A  │
└──────┬───────┘
       │
       │ Tailscale
       │
       ▼
┌──────────────┐
│ Sync Server  │
└──────┬───────┘
       │
       │ Tailscale
       │
       ▼
┌──────────────┐
│  Computer B  │
└──────────────┘
```

### Without Tailscale

```text
┌──────────────┐
│  Computer A  │
└──────┬───────┘
       │
       │ WebSocket
       ▼
┌──────────────────┐
│  Cloud / Server  │
│                  │
│  Sync Server     │
└────────┬─────────┘
         │
         │ WebSocket
         ▼
┌──────────────┐
│  Computer B  │
└──────────────┘
```

---

## 👨‍💻 Author

### Goldy Gour

Software Developer focused on:

- Flutter
- Dart
- Go
- Backend Engineering
- Full-Stack Development
- Real-Time Systems
- Networking
- Cloud Deployment
- Linux
- Self-Hosted Infrastructure

### Connect

- **GitHub:** [21goldy](https://github.com/21goldy)
- **LinkedIn:** [Goldy Gour](https://linkedin.com/in/goldy-gour)

---

## 📄 License

This project is currently intended primarily as a personal and learning project.

If this repository is later released as an open-source project, an appropriate open-source license can be added here.

---

## 🎬 Video Sync

<p align="center">
  <strong>Synchronize. Play. Watch Together.</strong>
</p>
