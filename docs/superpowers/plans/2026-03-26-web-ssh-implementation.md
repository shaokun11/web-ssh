# Web SSH Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based SSH web application with Go backend and React frontend, supporting local data storage and cross-device usage.

**Architecture:** Stateless Go backend handles WebSocket-to-SSH bridging. React frontend manages all state and data locally via IndexedDB. Single binary deployment with embedded frontend.

**Tech Stack:** Go + Echo + gorilla/websocket + golang.org/x/crypto/ssh (backend); React + Vite + xterm.js + Tailwind CSS + Zustand + Dexie.js (frontend)

---

## Phase 1: Project Scaffolding

### Task 1: Backend Project Setup

**Files:**
- Create: `backend/go.mod`
- Create: `backend/go.sum`
- Create: `backend/main.go`
- Create: `backend/.env.example`

- [ ] **Step 1: Initialize Go module**

```bash
cd E:/ai/remote-ssh
mkdir -p backend
cd backend
go mod init github.com/user/remote-ssh/backend
```

- [ ] **Step 2: Install dependencies**

```bash
cd backend
go get github.com/labstack/echo/v4@latest
go get github.com/labstack/echo/v4/middleware@latest
go get github.com/gorilla/websocket@latest
go get golang.org/x/crypto/ssh@latest
```

- [ ] **Step 3: Create main.go skeleton**

```go
package main

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	e.GET("/", func(c echo.Context) error {
		return c.String(200, "Web SSH Server")
	})

	e.Logger.Fatal(e.Start(":8080"))
}
```

- [ ] **Step 4: Verify server runs**

```bash
cd backend
go run main.go
```
Expected: Server starts on :8080, returns "Web SSH Server" at /

- [ ] **Step 5: Create .env.example**

```
SERVER_PORT=8080
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): initialize go project with echo framework"
```

---

### Task 2: Frontend Project Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`

- [ ] **Step 1: Create Vite React TypeScript project**

```bash
cd E:/ai/remote-ssh
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd frontend
npm install xterm @xterm/addon-fit zustand dexie tailwindcss postcss autoprefixer
npm install -D @types/node
```

- [ ] **Step 3: Initialize Tailwind CSS**

```bash
cd frontend
npx tailwindcss init -p
```

- [ ] **Step 4: Configure tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5: Update src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 6: Verify frontend runs**

```bash
cd frontend
npm run dev
```
Expected: Vite dev server starts, shows default React page

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): initialize react+vite project with tailwind"
```

---

## Phase 2: Backend SSH Implementation

### Task 3: WebSocket Handler

**Files:**
- Create: `backend/websocket/handler.go`
- Create: `backend/websocket/upgrader.go`

- [ ] **Step 1: Create websocket package directory**

```bash
mkdir -p backend/websocket
```

- [ ] **Step 2: Create upgrader.go**

```go
package websocket

import "github.com/gorilla/websocket"

var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}
```

- [ ] **Step 3: Create handler.go with message types**

```go
package websocket

import (
	"encoding/json"
)

type MessageType string

const (
	TypeConnect  MessageType = "connect"
	TypeInput    MessageType = "input"
	TypeResize   MessageType = "resize"
	TypeOutput   MessageType = "output"
	TypeError    MessageType = "error"
	TypeConnected MessageType = "connected"
)

type Message struct {
	Type MessageType    `json:"type"`
	Data json.RawMessage `json:"data"`
}

type ConnectData struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Username   string `json:"username"`
	PrivateKey string `json:"privateKey"`
}

type InputData struct {
	Input string `json:"input"`
}

type ResizeData struct {
	Cols int `json:"cols"`
	Rows int `json:"rows"`
}

type OutputData struct {
	Output string `json:"output"`
}

type ErrorData struct {
	Message string `json:"message"`
}

type ConnectedData struct {
	Success bool `json:"success"`
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/websocket/
git commit -m "feat(backend): add websocket message types"
```

---

### Task 4: SSH Client Implementation

**Files:**
- Create: `backend/ssh/client.go`
- Create: `backend/ssh/session.go`

- [ ] **Step 1: Create ssh package directory**

```bash
mkdir -p backend/ssh
```

- [ ] **Step 2: Create client.go**

```go
package ssh

import (
	"fmt"
	"golang.org/x/crypto/ssh"
)

type Client struct {
	client *ssh.Client
}

type Config struct {
	Host       string
	Port       int
	Username   string
	PrivateKey string
}

func NewClient(cfg Config) (*Client, error) {
	signer, err := ssh.ParsePrivateKey([]byte(cfg.PrivateKey))
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	config := &ssh.ClientConfig{
		User: cfg.Username,
		Auth: []ssh.AuthMethod{
			ssh.PublicKeys(signer),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	address := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	client, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return nil, fmt.Errorf("failed to dial: %w", err)
	}

	return &Client{client: client}, nil
}

func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
```

- [ ] **Step 3: Create session.go**

```go
package ssh

import (
	"io"
	"golang.org/x/crypto/ssh"
)

type Session struct {
	session *ssh.Session
	stdin   io.WriteCloser
	stdout  io.Reader
}

func (c *Client) NewSession() (*Session, error) {
	session, err := c.client.NewSession()
	if err != nil {
		return nil, err
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		session.Close()
		return nil, err
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		session.Close()
		return nil, err
	}

	session.Stderr = session.Stdout

	err = session.Shell()
	if err != nil {
		session.Close()
		return nil, err
	}

	return &Session{
		session: session,
		stdin:   stdin,
		stdout:  stdout,
	}, nil
}

func (s *Session) Write(data []byte) error {
	_, err := s.stdin.Write(data)
	return err
}

func (s *Session) Read(buf []byte) (int, error) {
	return s.stdout.Read(buf)
}

func (s *Session) Resize(cols, rows int) error {
	return s.session.WindowChange(rows, cols)
}

func (s *Session) Close() error {
	return s.session.Close()
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/ssh/
git commit -m "feat(backend): add ssh client with session management"
```

---

### Task 5: WebSocket-SSH Bridge

**Files:**
- Modify: `backend/websocket/handler.go`

- [ ] **Step 1: Add HandleTerminal function**

```go
package websocket

import (
	"backend/ssh"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

func HandleTerminal(c echo.Context) error {
	conn, err := Upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	var sshClient *ssh.Client
	var sshSession *ssh.Session

	defer func() {
		if sshSession != nil {
			sshSession.Close()
		}
		if sshClient != nil {
			sshClient.Close()
		}
	}()

	// Handle SSH output in goroutine
	outputChan := make(chan []byte, 100)
	stopRead := make(chan struct{})

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			close(stopRead)
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			continue
		}

		switch message.Type {
		case TypeConnect:
			var data ConnectData
			json.Unmarshal(message.Data, &data)

			sshClient, err = ssh.NewClient(ssh.Config{
				Host:       data.Host,
				Port:       data.Port,
				Username:   data.Username,
				PrivateKey: data.PrivateKey,
			})

			if err != nil {
				sendError(conn, err.Error())
				continue
			}

			sshSession, err = sshClient.NewSession()
			if err != nil {
				sendError(conn, err.Error())
				continue
			}

			sendConnected(conn, true)

			// Start reading output
			go readOutput(sshSession, conn, outputChan, stopRead)

		case TypeInput:
			if sshSession != nil {
				var data InputData
				json.Unmarshal(message.Data, &data)
				sshSession.Write([]byte(data.Input))
			}

		case TypeResize:
			if sshSession != nil {
				var data ResizeData
				json.Unmarshal(message.Data, &data)
				sshSession.Resize(data.Cols, data.Rows)
			}
		}
	}

	return nil
}

func readOutput(session *ssh.Session, conn *websocket.Conn, outputChan chan []byte, stop chan struct{}) {
	buf := make([]byte, 1024)
	for {
		select {
		case <-stop:
			return
		default:
			n, err := session.Read(buf)
			if err != nil {
				return
			}
			if n > 0 {
				sendOutput(conn, string(buf[:n]))
			}
		}
	}
}

func sendOutput(conn *websocket.Conn, output string) {
	data, _ := json.Marshal(Message{
		Type: TypeOutput,
		Data: mustMarshal(OutputData{Output: output}),
	})
	conn.WriteMessage(websocket.TextMessage, data)
}

func sendError(conn *websocket.Conn, msg string) {
	data, _ := json.Marshal(Message{
		Type: TypeError,
		Data: mustMarshal(ErrorData{Message: msg}),
	})
	conn.WriteMessage(websocket.TextMessage, data)
}

func sendConnected(conn *websocket.Conn, success bool) {
	data, _ := json.Marshal(Message{
		Type: TypeConnected,
		Data: mustMarshal(ConnectedData{Success: success}),
	})
	conn.WriteMessage(websocket.TextMessage, data)
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}
```

- [ ] **Step 2: Update main.go to add WebSocket route**

```go
package main

import (
	"backend/websocket"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	e.GET("/", func(c echo.Context) error {
		return c.String(200, "Web SSH Server")
	})

	e.GET("/ws", websocket.HandleTerminal)

	e.Logger.Fatal(e.Start(":8080"))
}
```

- [ ] **Step 3: Test compilation**

```bash
cd backend
go build -o server .
```
Expected: Builds without errors

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): implement websocket-ssh bridge"
```

---

### Task 6: Frontend Embedding

**Files:**
- Modify: `backend/main.go`
- Create: `backend/embed.go`

- [ ] **Step 1: Create embed.go**

```go
package main

import "embed"

//go:embed all:frontend/dist
var frontendFS embed.FS
```

- [ ] **Step 2: Update main.go to serve embedded frontend**

```go
package main

import (
	"backend/websocket"
	"embed"
	"io/fs"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

//go:embed all:dist
var frontendFS embed.FS

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// WebSocket endpoint
	e.GET("/ws", websocket.HandleTerminal)

	// Serve embedded frontend
	frontendDist, _ := fs.Sub(frontendFS, "dist")
	e.GET("/*", echo.WrapHandler(http.FileServer(http.FS(frontendDist))))

	e.Logger.Fatal(e.Start(":8080"))
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "feat(backend): add frontend embedding support"
```

---

## Phase 3: Frontend Implementation

### Task 7: Database Setup (Dexie.js)

**Files:**
- Create: `frontend/src/db/index.ts`

- [ ] **Step 1: Create database schema**

```typescript
// src/db/index.ts
import Dexie, { Table } from 'dexie';

export interface SSHConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  privateKey: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface CommandHistory {
  id: string;
  configId: string;
  command: string;
  executedAt: Date;
}

class SSHDatabase extends Dexie {
  configs!: Table<SSHConfig, string>;
  history!: Table<CommandHistory, string>;

  constructor() {
    super('WebSSH');
    this.version(1).stores({
      configs: 'id, name, host, createdAt, lastUsedAt',
      history: 'id, configId, command, executedAt'
    });
  }
}

export const db = new SSHDatabase();
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/db/
git commit -m "feat(frontend): add dexie database schema"
```

---

### Task 8: State Management (Zustand)

**Files:**
- Create: `frontend/src/store/connectionStore.ts`
- Create: `frontend/src/store/preferencesStore.ts`

- [ ] **Step 1: Create connection store**

```typescript
// src/store/connectionStore.ts
import { create } from 'zustand';
import { SSHConfig } from '../db';

interface ConnectionState {
  isConnected: boolean;
  currentConfig: SSHConfig | null;
  ws: WebSocket | null;

  setConnected: (connected: boolean) => void;
  setCurrentConfig: (config: SSHConfig | null) => void;
  setWs: (ws: WebSocket | null) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isConnected: false,
  currentConfig: null,
  ws: null,

  setConnected: (connected) => set({ isConnected: connected }),
  setCurrentConfig: (config) => set({ currentConfig: config }),
  setWs: (ws) => set({ ws }),
  disconnect: () => set((state) => {
    state.ws?.close();
    return { isConnected: false, currentConfig: null, ws: null };
  }),
}));
```

- [ ] **Step 2: Create preferences store**

```typescript
// src/store/preferencesStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  theme: 'light' | 'dark';
  fontSize: number;
  sidebarVisible: boolean;

  toggleTheme: () => void;
  setFontSize: (size: number) => void;
  toggleSidebar: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      sidebarVisible: true,

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
    }),
    { name: 'web-ssh-preferences' }
  )
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/
git commit -m "feat(frontend): add zustand stores for connection and preferences"
```

---

### Task 9: WebSocket Service

**Files:**
- Create: `frontend/src/services/websocket.ts`

- [ ] **Step 1: Create WebSocket service**

```typescript
// src/services/websocket.ts
import { SSHConfig } from '../db';

export type MessageType = 'connect' | 'input' | 'resize' | 'output' | 'error' | 'connected';

export interface WSMessage {
  type: MessageType;
  data: unknown;
}

export interface ConnectData {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private onOutput: (data: string) => void;
  private onError: (message: string) => void;
  private onConnected: (success: boolean) => void;

  constructor(
    onOutput: (data: string) => void,
    onError: (message: string) => void,
    onConnected: (success: boolean) => void
  ) {
    this.onOutput = onOutput;
    this.onError = onError;
    this.onConnected = onConnected;
  }

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      switch (msg.type) {
        case 'output':
          this.onOutput((msg.data as { output: string }).output);
          break;
        case 'error':
          this.onError((msg.data as { message: string }).message);
          break;
        case 'connected':
          this.onConnected((msg.data as { success: boolean }).success);
          break;
      }
    };
  }

  sendConnect(config: SSHConfig) {
    const data: ConnectData = {
      host: config.host,
      port: config.port,
      username: config.username,
      privateKey: config.privateKey,
    };
    this.send('connect', data);
  }

  sendInput(input: string) {
    this.send('input', { input });
  }

  sendResize(cols: number, rows: number) {
    this.send('resize', { cols, rows });
  }

  private send(type: MessageType, data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/
git commit -m "feat(frontend): add websocket service"
```

---

### Task 10: Terminal Component

**Files:**
- Create: `frontend/src/components/Terminal.tsx`

- [ ] **Step 1: Create Terminal component**

```tsx
// src/components/Terminal.tsx
import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { ws, isConnected } = useConnectionStore();
  const { theme, fontSize } = usePreferencesStore();

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const xterm = new XTerminal({
      fontSize,
      theme: theme === 'dark' ? darkTheme : lightTheme,
      fontFamily: 'Monaco, Menlo, "Courier New", monospace',
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && ws && isConnected) {
          ws.send(JSON.stringify({
            type: 'resize',
            data: { cols: dims.cols, rows: dims.rows }
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Handle input
    xterm.onData((data) => {
      if (ws && isConnected) {
        ws.send(JSON.stringify({ type: 'input', data: { input: data } }));
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme;
    }
  }, [theme]);

  // Update font size
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = fontSize;
      fitAddonRef.current?.fit();
    }
  }, [fontSize]);

  // Handle WebSocket messages
  useEffect(() => {
    if (!ws) return;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'output' && xtermRef.current) {
        xtermRef.current.write((msg.data as { output: string }).output);
      }
    };
  }, [ws]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full bg-gray-900 dark:bg-gray-950"
    />
  );
}

const darkTheme = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
};

const lightTheme = {
  background: '#ffffff',
  foreground: '#24292e',
  cursor: '#24292e',
  black: '#24292e',
  red: '#d73a49',
  green: '#28a745',
  yellow: '#ffd33d',
  blue: '#0366d6',
  magenta: '#6f42c1',
  cyan: '#1b6fbd',
  white: '#586069',
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Terminal.tsx
git commit -m "feat(frontend): add xterm.js terminal component"
```

---

### Task 11: Virtual Keyboard Component

**Files:**
- Create: `frontend/src/components/VirtualKeyboard.tsx`

- [ ] **Step 1: Create VirtualKeyboard component**

```tsx
// src/components/VirtualKeyboard.tsx
import { useConnectionStore } from '../store/connectionStore';

interface KeyButton {
  label: string;
  value: string;
  combo?: string;
}

const basicKeys: KeyButton[] = [
  { label: 'Esc', value: '\x1b' },
  { label: 'Tab', value: '\t' },
  { label: 'Ctrl', value: '', combo: 'ctrl' },
  { label: 'Alt', value: '', combo: 'alt' },
];

const arrowKeys: KeyButton[] = [
  { label: '↑', value: '\x1b[A' },
  { label: '↓', value: '\x1b[B' },
  { label: '←', value: '\x1b[D' },
  { label: '→', value: '\x1b[C' },
];

const comboKeys: KeyButton[] = [
  { label: 'Ctrl+C', value: '\x03' },
  { label: 'Ctrl+D', value: '\x04' },
  { label: 'Ctrl+Z', value: '\x1a' },
];

export function VirtualKeyboard() {
  const { ws, isConnected } = useConnectionStore();
  let ctrlHeld = false;
  let altHeld = false;

  const sendKey = (key: KeyButton) => {
    if (!ws || !isConnected) return;

    let value = key.value;

    if (key.combo === 'ctrl') {
      ctrlHeld = !ctrlHeld;
      return;
    }
    if (key.combo === 'alt') {
      altHeld = !altHeld;
      return;
    }

    if (ctrlHeld && value.length === 1) {
      const code = value.toLowerCase().charCodeAt(0) - 96;
      value = String.fromCharCode(code);
      ctrlHeld = false;
    }

    if (altHeld) {
      value = '\x1b' + value;
      altHeld = false;
    }

    ws.send(JSON.stringify({ type: 'input', data: { input: value } }));
  };

  return (
    <div className="bg-gray-800 dark:bg-gray-900 border-t border-gray-700 p-2 md:hidden">
      <div className="flex flex-wrap gap-1 justify-center">
        {basicKeys.map((key) => (
          <button
            key={key.label}
            onClick={() => sendKey(key)}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm font-medium"
          >
            {key.label}
          </button>
        ))}
        <div className="w-full h-1" />
        {arrowKeys.map((key) => (
          <button
            key={key.label}
            onClick={() => sendKey(key)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-lg"
          >
            {key.label}
          </button>
        ))}
        <div className="w-full h-1" />
        {comboKeys.map((key) => (
          <button
            key={key.label}
            onClick={() => sendKey(key)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium"
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/VirtualKeyboard.tsx
git commit -m "feat(frontend): add virtual keyboard for mobile"
```

---

### Task 12: Connection Form Component

**Files:**
- Create: `frontend/src/components/ConnectionForm.tsx`

- [ ] **Step 1: Create ConnectionForm component**

```tsx
// src/components/ConnectionForm.tsx
import { useState } from 'react';
import { db, SSHConfig } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { generateId } from '../utils/id';

interface Props {
  onClose: () => void;
}

export function ConnectionForm({ onClose }: Props) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');

  const { setWs, setConnected, setCurrentConfig } = useConnectionStore();

  const handleConnect = async () => {
    if (!host || !username || !privateKey) {
      setError('请填写所有必填字段');
      return;
    }

    const config: SSHConfig = {
      id: generateId(),
      name: name || `${username}@${host}`,
      host,
      port: parseInt(port) || 22,
      username,
      privateKey,
      createdAt: new Date(),
    };

    // Save to database
    await db.configs.add(config);

    // Connect via WebSocket
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'connect',
        data: {
          host: config.host,
          port: config.port,
          username: config.username,
          privateKey: config.privateKey,
        }
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'connected' && (msg.data as { success: boolean }).success) {
        setWs(ws);
        setConnected(true);
        setCurrentConfig(config);
        onClose();
      } else if (msg.type === 'error') {
        setError((msg.data as { message: string }).message);
        ws.close();
      }
    };

    ws.onerror = () => {
      setError('WebSocket 连接失败');
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 dark:text-white">新建连接</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">
              配置名称（可选）
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="我的服务器"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                主机地址 *
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                端口
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">
              用户名 *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="root"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">
              私钥 *
            </label>
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs h-32"
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleConnect}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            连接
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create utils/id.ts**

```typescript
// src/utils/id.ts
export function generateId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ConnectionForm.tsx frontend/src/utils/
git commit -m "feat(frontend): add connection form component"
```

---

### Task 13: Command History Sidebar

**Files:**
- Create: `frontend/src/components/CommandHistory.tsx`

- [ ] **Step 1: Create CommandHistory component**

```tsx
// src/components/CommandHistory.tsx
import { useEffect, useState } from 'react';
import { db, CommandHistory as CH } from '../db';
import { useConnectionStore } from '../store/connectionStore';
import { usePreferencesStore } from '../store/preferencesStore';

export function CommandHistory() {
  const [history, setHistory] = useState<CH[]>([]);
  const { currentConfig, ws, isConnected } = useConnectionStore();
  const { sidebarVisible, toggleSidebar } = usePreferencesStore();

  useEffect(() => {
    if (currentConfig) {
      db.history
        .where('configId')
        .equals(currentConfig.id)
        .reverse()
        .limit(100)
        .toArray()
        .then(setHistory);
    }
  }, [currentConfig]);

  // Track commands (simple heuristic: lines ending with Enter)
  useEffect(() => {
    if (!ws || !currentConfig) return;

    let buffer = '';
    const originalSend = ws.send.bind(ws);

    ws.send = (data: string) => {
      const msg = JSON.parse(data);
      if (msg.type === 'input') {
        const input = (msg.data as { input: string }).input;
        buffer += input;

        // Detect Enter key
        if (input === '\r' || input === '\n') {
          const command = buffer.trim();
          if (command) {
            db.history.add({
              id: crypto.randomUUID(),
              configId: currentConfig.id,
              command,
              executedAt: new Date(),
            });
            setHistory((prev) => [
              {
                id: crypto.randomUUID(),
                configId: currentConfig.id,
                command,
                executedAt: new Date(),
              },
              ...prev.slice(0, 99),
            ]);
          }
          buffer = '';
        }
      }
      originalSend(data);
    };

    return () => {
      ws.send = originalSend;
    };
  }, [ws, currentConfig]);

  const handleClick = (command: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: 'input', data: { input: command + '\r' } }));
    }
  };

  if (!sidebarVisible) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-gray-800 dark:bg-gray-700 text-white px-2 py-4 rounded-l"
      >
        ◀
      </button>
    );
  }

  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
        <h3 className="font-medium dark:text-white">命令历史</h3>
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          ▶
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.command)}
            className="w-full text-left px-2 py-1 text-sm font-mono hover:bg-gray-200 dark:hover:bg-gray-700 rounded truncate dark:text-gray-300"
          >
            {item.command}
          </button>
        ))}
        {history.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            暂无历史记录
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/CommandHistory.tsx
git commit -m "feat(frontend): add command history sidebar"
```

---

### Task 14: Header Component

**Files:**
- Create: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Create Header component**

```tsx
// src/components/Header.tsx
import { useState } from 'react';
import { usePreferencesStore } from '../store/preferencesStore';
import { useConnectionStore } from '../store/connectionStore';

interface Props {
  onNewConnection: () => void;
}

export function Header({ onNewConnection }: Props) {
  const { theme, toggleTheme } = usePreferencesStore();
  const { isConnected, currentConfig, disconnect } = useConnectionStore();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <header className="bg-gray-900 dark:bg-gray-950 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold">Web SSH</h1>
        {isConnected && currentConfig && (
          <span className="text-sm text-green-400">
            ● {currentConfig.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-gray-800 rounded"
          title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {isConnected ? (
          <button
            onClick={disconnect}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm"
          >
            断开
          </button>
        ) : (
          <button
            onClick={onNewConnection}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
          >
            新建连接
          </button>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Header.tsx
git commit -m "feat(frontend): add header component"
```

---

### Task 15: Main App Component

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/index.ts`

- [ ] **Step 1: Create components index**

```typescript
// src/components/index.ts
export { Terminal } from './Terminal';
export { VirtualKeyboard } from './VirtualKeyboard';
export { ConnectionForm } from './ConnectionForm';
export { CommandHistory } from './CommandHistory';
export { Header } from './Header';
```

- [ ] **Step 2: Update App.tsx**

```tsx
// src/App.tsx
import { useState, useEffect } from 'react';
import {
  Terminal,
  VirtualKeyboard,
  ConnectionForm,
  CommandHistory,
  Header,
} from './components';
import { usePreferencesStore } from './store/preferencesStore';
import { useConnectionStore } from './store/connectionStore';
import { db } from './db';

function App() {
  const [showForm, setShowForm] = useState(false);
  const { theme } = usePreferencesStore();
  const { isConnected, setCurrentConfig } = useConnectionStore();

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Load last used config on mount
  useEffect(() => {
    db.configs.orderBy('lastUsedAt').reverse().first().then((config) => {
      if (config) {
        setCurrentConfig(config);
      }
    });
  }, []);

  // Show connection form if not connected
  useEffect(() => {
    if (!isConnected) {
      setShowForm(true);
    }
  }, [isConnected]);

  return (
    <div className={`h-screen flex flex-col ${theme}`}>
      <Header onNewConnection={() => setShowForm(true)} />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-hidden">
            {isConnected ? (
              <Terminal />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p className="text-xl mb-4">欢迎使用 Web SSH</p>
                  <p className="text-sm">点击"新建连接"开始</p>
                </div>
              </div>
            )}
          </div>
          <VirtualKeyboard />
        </div>
        <CommandHistory />
      </main>

      {showForm && <ConnectionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/index.ts
git commit -m "feat(frontend): integrate all components in App"
```

---

## Phase 4: Build & Deployment

### Task 16: Frontend Build Configuration

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Update vite.config.ts for backend embedding**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
```

- [ ] **Step 2: Test frontend build**

```bash
cd frontend
npm run build
```
Expected: Build succeeds, outputs to ../backend/dist

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "feat(frontend): configure build output for backend embedding"
```

---

### Task 17: Docker Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/backend/dist ./dist
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Final image
FROM alpine:3.19
WORKDIR /app
COPY --from=backend-builder /app/backend/server .
EXPOSE 8080
CMD ["./server"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  web-ssh:
    build: .
    ports:
      - "8080:8080"
    restart: unless-stopped
```

- [ ] **Step 3: Create .dockerignore**

```
node_modules
.git
*.md
.env
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "feat: add docker configuration for deployment"
```

---

### Task 18: Final Integration Test

- [ ] **Step 1: Build and run with Docker**

```bash
cd E:/ai/remote-ssh
docker-compose up --build
```

- [ ] **Step 2: Test in browser**
- Open http://localhost:8080
- Create a new connection with valid SSH credentials
- Verify terminal connects and displays output
- Test virtual keyboard on mobile viewport
- Test theme toggle
- Test command history

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete web ssh application implementation"
```

---

## Summary

**Total Tasks:** 18
**Estimated Files:** ~25
**Key Milestones:**
1. Backend scaffolding with Echo
2. Frontend scaffolding with Vite + React
3. WebSocket-SSH bridge
4. Frontend components (Terminal, Virtual Keyboard, Forms)
5. Database and state management
6. Docker deployment
