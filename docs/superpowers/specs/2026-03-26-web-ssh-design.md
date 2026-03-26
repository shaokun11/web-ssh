# Web SSH Application Design

## Overview

A browser-based SSH web application designed as a lightweight, privacy-focused personal cloud terminal console. The system follows the principle of "minimal backend, intelligent frontend, fully local data".

## Tech Stack

### Backend (Go + Echo)
- **Framework**: Echo
- **WebSocket**: gorilla/websocket
- **SSH**: golang.org/x/crypto/ssh
- **Deployment**: Single binary with embedded frontend (Go embed)

### Frontend (React + Vite)
- **Terminal**: xterm.js + xterm-addon-fit
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Storage**: Dexie.js (IndexedDB) for configs/keys, LocalStorage for preferences

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
│  ┌─────────────────────────────────────────────┐   │
│  │           React App (Vite)                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │   │
│  │  │ xterm.js│  │Zustand  │  │   Dexie.js  │ │   │
│  │  │Terminal │  │  State  │  │  IndexedDB  │ │   │
│  │  └────┬────┘  └────┬────┘  └──────┬──────┘ │   │
│  └───────┼────────────┼──────────────┼────────┘   │
│          └────────────┼──────────────┘            │
│                       │ WebSocket                 │
└───────────────────────┼───────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│              Go Server (Echo)                         │
│  ┌─────────────┐      ┌─────────────────────────┐    │
│  │   HTTP/WS   │ ───▶ │    SSH Client (ssh2)    │    │
│  │   Handler   │      │  (golang.org/x/crypto)  │    │
│  └─────────────┘      └───────────┬─────────────┘    │
│                                   │                   │
└───────────────────────────────────┼───────────────────┘
                                    │ SSH Protocol
                                    ▼
                           ┌────────────────┐
                           │  Target SSH    │
                           │    Server      │
                           └────────────────┘
```

## Data Flow

1. User enters SSH config (IP, username, private key) in frontend
2. Frontend sends connection request via WebSocket
3. Backend receives request, establishes SSH connection, returns success/failure
4. Bidirectional forwarding:
   - Terminal input → WebSocket → SSH → Server
   - Server output → SSH → WebSocket → Terminal

## Data Models

### IndexedDB Storage (Dexie.js)

```typescript
// SSH Connection Configuration
interface SSHConfig {
  id: string;
  name: string;        // Config name, e.g. "Production Server"
  host: string;
  port: number;
  username: string;
  privateKey: string;  // PEM format private key
  createdAt: Date;
  lastUsedAt?: Date;
}

// Command History
interface CommandHistory {
  id: string;
  configId: string;    // Associated config ID
  command: string;
  executedAt: Date;
}
```

### LocalStorage Storage

```typescript
// User Preferences
interface Preferences {
  theme: 'light' | 'dark';
  fontSize: number;
  sidebarVisible: boolean;
}
```

## WebSocket Protocol

### Client → Server

```json
// Establish connection
{"type": "connect", "data": {"host": "1.2.3.4", "port": 22, "username": "root", "privateKey": "-----BEGIN..."}}
// Terminal input
{"type": "input", "data": "ls -la\n"}
// Terminal resize
{"type": "resize", "data": {"cols": 120, "rows": 40}}
```

### Server → Client

```json
// Connection result
{"type": "connected", "data": {"success": true}}
// Connection failure
{"type": "error", "data": {"message": "authentication failed"}}
// Terminal output
{"type": "output", "data": "root@server:~# "}
```

## UI Layout

### Desktop (> 768px)

```
┌──────────────────────────────────────────────────────────────┐
│  Logo | Theme Toggle | New Connection         [≡ History]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                        Terminal Area                         │
│                     (xterm.js)                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Features:
- Virtual keyboard bar: Hidden (physical keyboard available)
- Command history: Right sidebar, collapsible
- Native keyboard shortcuts supported

### Mobile/iPad (<= 768px)

```
┌────────────────────────────────────┐
│  Logo | Theme | New | [≡]         │
├────────────────────────────────────┤
│                                    │
│           Terminal Area            │
│         (xterm.js)                 │
│                                    │
├────────────────────────────────────┤
│ [Esc][Tab][Ctrl][Alt][↑][↓][←][→]  │
│ [Ctrl+C][Ctrl+D][Ctrl+Z]           │
└────────────────────────────────────┘
```

Features:
- Virtual keyboard bar: Visible
- Command history: Drawer-style sidebar
- Viewport adaptation for virtual keyboard popup

## Virtual Shortcut Keys

Extended version includes:
- Basic: Esc, Tab, Ctrl, Alt
- Arrow keys: ↑, ↓, ←, →
- Common combos: Ctrl+C, Ctrl+D, Ctrl+Z

## Responsive Breakpoints

```css
/* Desktop: > 768px */
- Virtual keyboard bar: hidden
- Command history: right sidebar, always visible

/* Mobile/iPad: <= 768px */
- Virtual keyboard bar: visible
- Command history: drawer-style sidebar
```

## MVP Scope (Standard Version)

### Included
- Basic terminal + WebSocket connection
- Local config storage (IndexedDB)
- Virtual shortcut keys (extended)
- Theme switching (Light/Dark)
- Command history sidebar
- Responsive design (Desktop + Mobile)

### Future Iterations
- PWA support
- Private key encryption
- Deep iPad keyboard optimization

## Deployment

- Single binary with embedded frontend via Go embed
- Dockerfile for one-click deployment
- No database, no external dependencies
