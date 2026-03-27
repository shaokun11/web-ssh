package config

import (
	"os"
	"strconv"
	"time"
)

// SecurityConfig holds security-related configuration
type SecurityConfig struct {
	// Timeouts
	SSHConnectTimeout   time.Duration
	SSHReadWriteTimeout time.Duration
	WSReadTimeout       time.Duration
	WSWriteTimeout      time.Duration
	WSHandshakeTimeout  time.Duration
	WSPingInterval      time.Duration
	WSPongWait          time.Duration

	// Resource limits
	MaxConcurrentConnections int
	MaxMessageSize           int64
	ReadBufferSize           int
	WriteBufferSize          int

	// Input validation
	MaxInputLength    int
	MaxHostLength     int
	MaxUsernameLength int
	MaxKeyLength      int
	MaxPasswordLength int
	MaxPort           int
	MinPort           int

	// Rate limiting
	InputRateLimit int // Max inputs per second
}

// DefaultConfig returns the default security configuration
func DefaultConfig() *SecurityConfig {
	return &SecurityConfig{
		// Timeouts
		SSHConnectTimeout:   getEnvDuration("SSH_CONNECT_TIMEOUT", 30*time.Second),
		SSHReadWriteTimeout: getEnvDuration("SSH_READ_WRITE_TIMEOUT", 0), // 0 = no timeout
		WSReadTimeout:       getEnvDuration("WS_READ_TIMEOUT", 60*time.Second),
		WSWriteTimeout:      getEnvDuration("WS_WRITE_TIMEOUT", 10*time.Second),
		WSHandshakeTimeout:  getEnvDuration("WS_HANDSHAKE_TIMEOUT", 10*time.Second),
		WSPingInterval:      getEnvDuration("WS_PING_INTERVAL", 30*time.Second), // Send ping every 30s
		WSPongWait:          getEnvDuration("WS_PONG_WAIT", 60*time.Second),      // Wait 60s for pong response,

		// Resource limits
		MaxConcurrentConnections: getEnvInt("MAX_CONNECTIONS", 100),
		MaxMessageSize:           getEnvInt64("MAX_MESSAGE_SIZE", 64*1024), // 64KB
		ReadBufferSize:           4096,
		WriteBufferSize:          4096,

		// Input validation
		MaxInputLength:    getEnvInt("MAX_INPUT_LENGTH", 4096),    // 4KB per input
		MaxHostLength:     getEnvInt("MAX_HOST_LENGTH", 253),      // Max DNS name length
		MaxUsernameLength: getEnvInt("MAX_USERNAME_LENGTH", 64),   // Typical Unix username limit
		MaxKeyLength:      getEnvInt("MAX_KEY_LENGTH", 16*1024),   // 16KB for SSH key
		MaxPasswordLength: getEnvInt("MAX_PASSWORD_LENGTH", 256),
		MaxPort:           65535,
		MinPort:           1,

		// Rate limiting
		InputRateLimit: getEnvInt("INPUT_RATE_LIMIT", 100), // 100 inputs/sec
	}
}

// Global config instance
var Config = DefaultConfig()

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if seconds, err := strconv.Atoi(val); err == nil {
			return time.Duration(seconds) * time.Second
		}
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

func getEnvInt64(key string, defaultVal int64) int64 {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.ParseInt(val, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultVal
}
