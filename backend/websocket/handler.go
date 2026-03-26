package websocket

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"

	"backend/ssh"
)

func HandleTerminal(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
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

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
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
				sshClient.Close()
				sshClient = nil
				continue
			}

			sendConnected(conn, true)

			// Start reading output in goroutine
			go readOutput(sshSession, conn)

		case TypeInput:
			if sshSession != nil {
				var data InputData
				if err := json.Unmarshal(message.Data, &data); err != nil {
					continue
				}
				sshSession.Write([]byte(data.Input))
			}

		case TypeResize:
			if sshSession != nil {
				var data ResizeData
				if err := json.Unmarshal(message.Data, &data); err != nil {
					continue
				}
				sshSession.Resize(data.Cols, data.Rows)
			}
		}
	}
}

func readOutput(session *ssh.Session, conn *websocket.Conn) {
	buf := make([]byte, 4096)
	for {
		n, err := session.Read(buf)
		if err != nil {
			return
		}
		if n > 0 {
			// Use BinaryMessage to preserve escape sequences exactly
			// Make a copy of the data to avoid race conditions
			data := make([]byte, n)
			copy(data, buf[:n])
			conn.WriteMessage(websocket.BinaryMessage, data)
		}
	}
}

// Keep sendOutput for reference but not used
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
