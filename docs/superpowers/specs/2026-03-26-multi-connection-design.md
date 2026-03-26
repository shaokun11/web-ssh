# Multi-Connection & Command History Design

## Overview

Add support for multiple simultaneous SSH connections with a tabbed interface, enhanced sidebar, and command history recording with autocomplete.

## Goals

- Multiple simultaneous SSH connections
- Tab-based switching between active sessions
- Sidebar showing active + saved connections
- Command history recording per connection
- Tab autocomplete from command history

---

## Data Model

### ActiveSession

```typescript
interface ActiveSession {
  configId: string;           // Reference to SSHConfig.id
  ws: WebSocket;              // Live WebSocket connection
  terminalBuffer: string;     // Buffered output when tab is backgrounded
  tabName: string;            // Custom tab name (defaults to config.name)
  connectedAt: Date;          // When connection was established
  status: 'connecting' | 'connected' | 'disconnected';
}
```

### Store Updates

```typescript
interface ConnectionState {
  // Saved configurations
  configs: SSHConfig[];

  // Active sessions
  sessions: Map<string, ActiveSession>;  // configId -> session
  activeConfigId: string | null;

  // Actions
  connect: (config: SSHConfig) => void;
  disconnect: (configId: string) => void;
  focusSession: (configId: string) => void;
  renameTab: (configId: string, name: string) => void;
  duplicateSession: (configId: string) => void;

  // Existing
  loadConfigs: () => Promise<void>;
  addConfig: (config: SSHConfig) => void;
  removeConfig: (id: string) => void;
}
```

### History Store (New)

```typescript
interface HistoryState {
  histories: Map<string, CommandHistoryItem[]>;  // configId -> items

  loadHistory: (configId: string) => Promise<void>;
  addCommand: (configId: string, command: string) => void;
  searchHistory: (configId: string, prefix: string) => string[];
  clearHistory: (configId: string) => void;
}
```

---

## UI Layout

### Tab Bar

Located above terminal area:

```
┌─────────────────────────────────────────────────────────────────┐
│ [🏠 Server1 ✕] [📊 DB-Server ✕] [+ 新建]                        │
├─────────────────────────────────────────────────────────────────┤
│                     Terminal Content                            │
└─────────────────────────────────────────────────────────────────┘
```

- Each tab: icon + name + close button
- Dropdown menu (⋮) on hover: 重命名 | 复制会话 | 复制连接信息 | 重新连接
- Active tab highlighted with accent color
- `[+ 新建]` button on the right

### Sidebar (Updated)

```
┌─────────────────────┐
│ 🔗 活动连接 (2)      │
├─────────────────────┤
│ ● Server1      [⋮]  │  ← green dot, connected
│ ● DB-Server    [⋮]  │
├─────────────────────┤
│ 📋 已保存 (5)        │
├─────────────────────┤
│ ○ Backup-Server     │  ← gray dot, not connected
│ ○ Test-Server       │
└─────────────────────┘
```

- Two sections: "活动连接" and "已保存"
- Active connections have green dot
- Saved but inactive have gray dot
- Clicking active connection focuses its tab
- Clicking saved connection starts new session

### Command History Sidebar (Right)

- Shows history for currently focused session
- Search/filter box at top
- Each entry: command + timestamp
- Click to insert command into terminal

---

## Command History & Autocomplete

### History Recording

- Capture command when user presses `Enter` in terminal
- Save to IndexedDB: `{ id, configId, command, executedAt }`
- Linked to the active session's `configId`
- Filter rules:
  - Skip empty commands
  - Skip duplicates within 60 seconds (same command, same session)

### Tab Autocomplete

1. User types partial command: `doc`
2. User presses `Tab`
3. System searches history for commands starting with `doc`
4. If one match: Auto-complete to full command
5. If multiple matches: Show dropdown
6. If no match: Send Tab to SSH server (server-side autocomplete)

### Autocomplete Dropdown

```
┌─────────────────────────────┐
│ docker ps -a                │
│ docker-compose up -d        │
│ docker logs --tail 100      │
└─────────────────────────────┘
```

- Max 5 suggestions
- Arrow keys to navigate, Enter to select, Escape to close
- Sorted by most recent first

---

## Data Flow

### Connection Flow

```
User clicks saved config
       │
       ▼
Check if configId exists in sessions?
       │
    ┌──┴──┐
   Yes    No
    │      │
    ▼      ▼
Focus   Create new WebSocket
tab     → Send connect msg
        → On success: Add to sessions
        → Focus new tab
```

### Tab Switch Flow

```
User clicks tab
       │
       ▼
Set activeConfigId = clicked configId
       │
       ▼
TerminalContainer:
  - Hides previous terminal
  - Shows new terminal
  - Updates history sidebar
```

### Command Capture Flow

```
User presses Enter in terminal
       │
       ▼
Capture command from input
       │
       ▼
Save to IndexedDB (configId, command, timestamp)
       │
       ▼
Send to SSH server via WebSocket
```

---

## Components & File Structure

### New Components

```
frontend/src/components/
├── TabBar/
│   ├── TabBar.tsx           # Tab bar container
│   ├── Tab.tsx              # Single tab component
│   └── TabMenu.tsx          # Dropdown menu
├── TerminalContainer.tsx    # Manages multiple terminal instances
├── AutocompleteDropdown.tsx # Tab autocomplete overlay
└── ...
```

### Updated Components

```
├── ConnectionSidebar.tsx    # Add active/saved sections, status dots
├── Terminal.tsx             # Support multiple via configId
├── CommandHistory.tsx       # Filter by configId, add search
└── App.tsx                  # Remove single-connection logic
```

### New Store

```
frontend/src/store/
├── connectionStore.ts       # Updated with sessions Map
├── historyStore.ts          # NEW: Command history
└── preferencesStore.ts      # Existing
```

---

## Backend

No changes required. Current backend handles each WebSocket independently:

```go
func HandleTerminal(w http.ResponseWriter, r *http.Request) {
    conn, _ := upgrader.Upgrade(w, r, nil)
    var sshClient *ssh.Client
    var sshSession *ssh.Session
    // Each connection is isolated
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Connection fails | Error toast, tab shows "Disconnected", retry button |
| WebSocket drops | Auto-retry 3x with 2s delay, then "Disconnected" |
| Tab close with running command | Confirmation dialog |
| Duplicate config name | Auto-append timestamp: "Server (2)" |
| History search empty | "No matching commands" placeholder |

---

## Implementation Phases

### Phase 1: Session Management
- Update connectionStore with sessions Map
- Create TerminalContainer for multiple terminals
- Update App.tsx to use new session model

### Phase 2: Tab UI
- Create TabBar component
- Create Tab component with menu
- Integrate with session management

### Phase 3: Sidebar Updates
- Update ConnectionSidebar with active/saved sections
- Add status indicators (green/gray dots)
- Connect click handlers to session actions

### Phase 4: Command History
- Create historyStore
- Update CommandHistory to filter by configId
- Add search functionality

### Phase 5: Autocomplete
- Create AutocompleteDropdown component
- Add Tab key handler in Terminal
- Integrate history search
