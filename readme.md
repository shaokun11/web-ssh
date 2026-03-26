# WebSSH - Browser-based SSH Terminal

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

A modern, secure, and lightweight SSH terminal that runs entirely in your browser. Built with privacy-first design - all sensitive data stays on your device.

### Features

- **Browser-based SSH** - No software installation required
- **Multi-tab Sessions** - Connect to multiple servers simultaneously
- **Privacy First** - Credentials stored locally in your browser (IndexedDB)
- **Multi-language** - English and Chinese support
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Theme** - Easy on the eyes
- **Quick Commands** - Pre-built command templates
- **Command History** - Track and reuse previous commands
- **Config Import/Export** - Backup and restore your connections

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- xterm.js (Terminal emulation)
- Zustand (State management)
- react-i18next (Internationalization)
- IndexedDB (Local storage)

**Backend:**
- Go + Echo framework
- ssh2 (SSH protocol)
- gorilla/websocket (WebSocket)
- Stateless design - no data stored on server

### Quick Start

#### Using Docker (Recommended)

```bash
# Build and run
docker-compose up -d

# Access at http://localhost:8080
```

#### Pull from Docker Hub

```bash
# Pull the latest image
docker pull your username/webssh:latest

# Run container
docker run -d -p 8080:8080 yourusername/webssh:latest
```

#### Manual Setup

**Prerequisites:**
- Go 1.21+
- Node.js 18+
- pnpm (recommended)

**Backend:**
```bash
cd backend
go mod download
go run main.go
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
```

### Configuration

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `MAX_CONNECTIONS` | Max concurrent SSH sessions | `100` |
| `SSH_CONNECT_TIMEOUT` | SSH connection timeout (seconds) | `30` |
| `MAX_INPUT_LENGTH` | Max input length (bytes) | `4096` |

### Security Considerations

This application is designed with security in mind:

1. **No Server-side Data Storage** - All credentials and SSH keys are stored locally in your browser using IndexedDB
2. **Stateless Backend** - The Go server only proxies SSH connections, no data is persisted
3. **CORS Protection** - Configurable origin validation
4. **SSH Host Key Verification** - Warns on unknown host keys

**Important Notes:**
- Never share your browser's IndexedDB data
- Use HTTPS in production deployments
- Set proper `ALLOWED_ORIGINS` for your domain
- Consider using SSH key passphrases for additional security

### Privacy

Your data never leaves your device:
- SSH credentials stored locally in browser
- No analytics or tracking
- No external API calls (except your SSH servers)
- Connection configs exportable as encrypted JSON

### Development

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint
```

### License

MIT License - see [LICENSE](LICENSE) for details.

---

<a name="中文"></a>
## 中文

一个现代化、安全且轻量的浏览器端 SSH 终端。采用隐私优先设计 - 所有敏感数据都保存在您的设备上。

### 功能特性

- **浏览器端 SSH** - 无需安装任何软件
- **多标签会话** - 同时连接多个服务器
- **隐私优先** - 凭证安全存储在浏览器本地 (IndexedDB)
- **多语言支持** - 支持中英文切换
- **响应式设计** - 适配电脑、平板和手机
- **深色/浅色主题** - 保护您的眼睛
- **快捷命令** - 预置常用命令模板
- **命令历史** - 追踪并复用历史命令
- **配置导入导出** - 备份和恢复连接配置

### 技术栈

**前端:**
- React 18 + TypeScript
- xterm.js (终端模拟)
- Zustand (状态管理)
- react-i18next (国际化)
- IndexedDB (本地存储)

**后端:**
- Go + Echo 框架
- ssh2 (SSH 协议)
- gorilla/websocket (WebSocket)
- 无状态设计 - 服务器不存储任何数据

### 快速开始

#### 使用 Docker (推荐)

```bash
# 构建并运行
docker-compose up -d

# 访问 http://localhost:8080
```

#### 手动设置

**前置条件:**
- Go 1.21+
- Node.js 18+
- pnpm (推荐)

**后端:**
```bash
cd backend
go mod download
go run main.go
```

**前端:**
```bash
cd frontend
pnpm install
pnpm dev
```

### 配置

#### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `PORT` | 服务器端口 | `8080` |
| `ALLOWED_ORIGINS` | CORS 允许的源 | `*` |

### 安全注意事项

本应用的安全性设计:

1. **无服务器端数据存储** - 所有凭证和 SSH 密钥使用 IndexedDB 存储在浏览器本地
2. **无状态后端** - Go 服务器仅代理 SSH 连接，不持久化任何数据
3. **CORS 保护** - 可配置的源验证
4. **SSH 主机密钥验证** - 未知主机密钥时会警告

**重要提示:**
- 请勿分享您浏览器的 IndexedDB 数据
- 生产环境请使用 HTTPS
- 为您的域名设置正确的 `ALLOWED_ORIGINS`
- 考虑为 SSH 密钥设置密码以获得额外安全性

### 隐私保护

您的数据永远不会离开您的设备:
- SSH 凭证存储在浏览器本地
- 无分析或跟踪
- 无外部 API 调用（除了您的 SSH 服务器）
- 连接配置可导出为 JSON

### 开发

```bash
# 安装依赖
pnpm install

# 开发服务器
pnpm dev

# 生产构建
pnpm build

# 代码检查
pnpm lint
```

### 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)。

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

Built with love for the open source community.

## Acknowledgments

- [xterm.js](https://xtermjs.org/) - Terminal emulator for the web
- [ssh2](https://github.com/mscdex/ssh2) - SSH2 client and server modules
- [Echo](https://echo.labstack.com/) - High performance Go web framework
