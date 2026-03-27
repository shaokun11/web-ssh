package ssh

import (
	"fmt"
	"net"
	"os"
	"strings"

	"golang.org/x/crypto/ssh"

	"backend/config"
)

type Client struct {
	client *ssh.Client
}

type Config struct {
	Host       string
	Port       int
	Username   string
	PrivateKey string
	Password   string
}

var dockerDetectionFn = isRunningInDocker

func normalizeHostForDial(host string) string {
	if !dockerDetectionFn() {
		return host
	}

	if strings.EqualFold(host, "localhost") || host == "127.0.0.1" || host == "::1" {
		return "host.docker.internal"
	}

	return host
}

func isRunningInDocker() bool {
	if _, err := os.Stat("/.dockerenv"); err == nil {
		return true
	}
	return false
}

func NewClient(cfg Config) (*Client, error) {
	// Input validation - prevent abuse
	if len(cfg.Host) > config.Config.MaxHostLength {
		return nil, fmt.Errorf("host too long (max %d)", config.Config.MaxHostLength)
	}
	if len(cfg.Username) > config.Config.MaxUsernameLength {
		return nil, fmt.Errorf("username too long (max %d)", config.Config.MaxUsernameLength)
	}
	if len(cfg.Password) > config.Config.MaxPasswordLength {
		return nil, fmt.Errorf("password too long (max %d)", config.Config.MaxPasswordLength)
	}
	if len(cfg.PrivateKey) > config.Config.MaxKeyLength {
		return nil, fmt.Errorf("private key too long (max %d)", config.Config.MaxKeyLength)
	}
	if cfg.Port < config.Config.MinPort || cfg.Port > config.Config.MaxPort {
		return nil, fmt.Errorf("invalid port number (must be %d-%d)", config.Config.MinPort, config.Config.MaxPort)
	}

	sshConfig := &ssh.ClientConfig{
		User:            cfg.Username,
		Auth:            []ssh.AuthMethod{},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         config.Config.SSHConnectTimeout,
	}

	// Add authentication methods
	if cfg.Password != "" {
		sshConfig.Auth = append(sshConfig.Auth, ssh.Password(cfg.Password))
	}
	if cfg.PrivateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(cfg.PrivateKey))
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
		sshConfig.Auth = append(sshConfig.Auth, ssh.PublicKeys(signer))
	}

	if len(sshConfig.Auth) == 0 {
		return nil, fmt.Errorf("no authentication method provided")
	}

	// Format address properly (works with IPv6)
	dialHost := normalizeHostForDial(cfg.Host)
	address := net.JoinHostPort(dialHost, fmt.Sprintf("%d", cfg.Port))

	// Use DialTimeout for connection with timeout
	conn, err := net.DialTimeout("tcp", address, config.Config.SSHConnectTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to connect: %w", err)
	}

	sshConn, chans, reqs, err := ssh.NewClientConn(conn, address, sshConfig)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to establish SSH connection: %w", err)
	}

	client := ssh.NewClient(sshConn, chans, reqs)

	return &Client{client: client}, nil
}

func (c *Client) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}
