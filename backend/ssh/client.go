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
