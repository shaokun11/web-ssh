package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"backend/config"
	"backend/ssh"
)

var (
	ErrTooManyConnections = &WebsocketError{Code: "TOO_MANY_CONNECTIONS", Message: "Maximum concurrent connections reached"}
	ErrMessageTooLarge    = &WebsocketError{Code: "MESSAGE_TOO_LARGE", Message: "Message exceeds maximum size"}
	ErrInputTooLong       = &WebsocketError{Code: "INPUT_TOO_LONG", Message: "Input exceeds maximum length"}
	ErrRateLimitExceeded  = &WebsocketError{Code: "RATE_LIMIT", Message: "Input rate limit exceeded"}
)

type WebsocketError struct {
	Code    string
	Message string
}

func (e *WebsocketError) Error() string {
	return e.Message
}

// RateLimiter tracks input rate per connection
type RateLimiter struct {
	mu         sync.Mutex
	timestamps []time.Time
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		timestamps: make([]time.Time, 0, config.Config.InputRateLimit),
	}
}

func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-time.Second)

	// Remove old timestamps
	valid := rl.timestamps[:0]
	for _, t := range rl.timestamps {
		if t.After(windowStart) {
			valid = append(valid, t)
		}
	}
	rl.timestamps = valid

	// Check rate limit
	if len(rl.timestamps) >= config.Config.InputRateLimit {
		return false
	}

	rl.timestamps = append(rl.timestamps, now)
	return true
}

// ConnectionManager for tracking active connections
type ConnectionManager struct {
	mu          sync.Mutex
	connections map[*websocket.Conn]struct{}
	count       int
}

var connManager = &ConnectionManager{
	connections: make(map[*websocket.Conn]struct{}),
}

func (cm *ConnectionManager) Add(conn *websocket.Conn) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if cm.count >= config.Config.MaxConcurrentConnections {
		return ErrTooManyConnections
	}

	cm.connections[conn] = struct{}{}
	cm.count++
	return nil
}

func (cm *ConnectionManager) Remove(conn *websocket.Conn) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if _, exists := cm.connections[conn]; exists {
		delete(cm.connections, conn)
		cm.count--
	}
}

func HandleTerminal(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:   config.Config.ReadBufferSize,
		WriteBufferSize:  config.Config.WriteBufferSize,
		HandshakeTimeout: config.Config.WSWriteTimeout,
		CheckOrigin: func(r *http.Request) bool {
			// TODO: In production, validate against ALLOWED_ORIGINS
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	// Track connection
	if err := connManager.Add(conn); err != nil {
		sendError(conn, err.Error())
		return
	}
	defer connManager.Remove(conn)

	conn.SetReadLimit(config.Config.MaxMessageSize)

	// Setup pong handler to extend read deadline
	conn.SetReadDeadline(time.Now().Add(config.Config.WSPongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(config.Config.WSPongWait))
		return nil
	})

	// Start ping ticker to keep connection alive
	pingTicker := time.NewTicker(config.Config.WSPingInterval)
	defer pingTicker.Stop()

	var sshClient *ssh.Client
	var sshSession *ssh.Session
	rateLimiter := NewRateLimiter()

	defer func() {
		if sshSession != nil {
			sshSession.Close()
		}
		if sshClient != nil {
			sshClient.Close()
		}
	}()

	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start ping ticker goroutine
	go func() {
		for {
			select {
			case <-pingTicker.C:
				if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(config.Config.WSWriteTimeout)); err != nil {
					log.Printf("Failed to send ping: %v", err)
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Check message size
		if int64(len(msg)) > config.Config.MaxMessageSize {
			sendError(conn, ErrMessageTooLarge.Error())
			continue
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			continue
		}

		switch message.Type {
		case TypeConnect:
			var data ConnectData
			if err := json.Unmarshal(message.Data, &data); err != nil {
				sendError(conn, "Invalid connect data")
				continue
			}

			// Validate input lengths
			if len(data.Host) > config.Config.MaxHostLength {
				sendError(conn, "Host too long")
				continue
			}
			if len(data.Username) > config.Config.MaxUsernameLength {
				sendError(conn, "Username too long")
				continue
			}
			if len(data.Password) > config.Config.MaxPasswordLength {
				sendError(conn, "Password too long")
				continue
			}
			if len(data.PrivateKey) > config.Config.MaxKeyLength {
				sendError(conn, "Private key too long")
				continue
			}
			if data.Port < config.Config.MinPort || data.Port > config.Config.MaxPort {
				sendError(conn, "Invalid port number")
				continue
			}

			sshClient, err = ssh.NewClient(ssh.Config{
				Host:       data.Host,
				Port:       data.Port,
				Username:   data.Username,
				PrivateKey: data.PrivateKey,
				Password:   data.Password,
			})

			if err != nil {
				sendError(conn, err.Error())
				continue
			}

			sshSession, err = sshClient.NewSession()
			if err != nil {
				sendError(conn, err.Error())
				sshClient.Close()
				sshClient = nil
				continue
			}

			sendConnected(conn, true)

			// Start reading output in goroutine
			go readOutput(ctx, sshSession, conn)

		case TypeInput:
			if sshSession != nil {
				var data InputData
				if err := json.Unmarshal(message.Data, &data); err != nil {
					continue
				}

				// Validate input length
				if len(data.Input) > config.Config.MaxInputLength {
					sendError(conn, ErrInputTooLong.Error())
					continue
				}

				// Rate limiting
				if !rateLimiter.Allow() {
					sendError(conn, ErrRateLimitExceeded.Error())
					continue
				}

				if err := sshSession.Write([]byte(data.Input)); err != nil {
					log.Printf("Failed to write to session: %v", err)
					break
				}
			}

		case TypeResize:
			if sshSession != nil {
				var data ResizeData
				if err := json.Unmarshal(message.Data, &data); err != nil {
					continue
				}

				// Validate resize values (reasonable limits)
				if data.Cols < 1 || data.Cols > 1000 || data.Rows < 1 || data.Rows > 1000 {
					continue
				}

				if err := sshSession.Resize(data.Cols, data.Rows); err != nil {
					log.Printf("Failed to resize terminal: %v", err)
				}
			}
		}
	}
}

func readOutput(ctx context.Context, session *ssh.Session, conn *websocket.Conn) {
	buf := make([]byte, config.Config.ReadBufferSize)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			n, err := session.Read(buf)
			if err != nil {
				return
			}
			if n > 0 {
				// Make a copy of the data to avoid race conditions
				data := make([]byte, n)
				copy(data, buf[:n])

				// Set write deadline
				conn.SetWriteDeadline(time.Now().Add(config.Config.WSWriteTimeout))

				if err := conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
					log.Printf("Failed to write message: %v", err)
					return
				}
			}
		}
	}
}

func sendError(conn *websocket.Conn, msg string) {
	data, _ := json.Marshal(Message{
		Type: TypeError,
		Data: mustMarshal(ErrorData{Message: msg}),
	})
	conn.SetWriteDeadline(time.Now().Add(config.Config.WSWriteTimeout))
	conn.WriteMessage(websocket.TextMessage, data)
}

func sendConnected(conn *websocket.Conn, success bool) {
	data, _ := json.Marshal(Message{
		Type: TypeConnected,
		Data: mustMarshal(ConnectedData{Success: success}),
	})
	conn.SetWriteDeadline(time.Now().Add(config.Config.WSWriteTimeout))
	conn.WriteMessage(websocket.TextMessage, data)
}

func mustMarshal(v interface{}) json.RawMessage {
	data, _ := json.Marshal(v)
	return data
}
