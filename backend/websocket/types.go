package websocket

import "encoding/json"

type MessageType string

const (
	TypeConnect   MessageType = "connect"
	TypeInput     MessageType = "input"
	TypeResize    MessageType = "resize"
	TypeOutput    MessageType = "output"
	TypeError     MessageType = "error"
	TypeConnected MessageType = "connected"
)

type Message struct {
	Type MessageType     `json:"type"`
	Data json.RawMessage `json:"data"`
}

type ConnectData struct {
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Username   string `json:"username"`
	PrivateKey string `json:"privateKey"`
	Password   string `json:"password"`
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
	Code    string `json:"code,omitempty"`
}

type ConnectedData struct {
	Success bool `json:"success"`
}
