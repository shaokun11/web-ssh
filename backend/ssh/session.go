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

	// Request PTY (pseudo-terminal) - essential for proper terminal emulation
	// Using xterm-256color for full color support
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,     // Enable echo
		ssh.TTY_OP_ISPEED: 14400, // Input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // Output speed = 14.4kbaud
	}

	// Request PTY with default size (will be resized later via WindowChange)
	err = session.RequestPty("xterm-256color", 40, 120, modes)
	if err != nil {
		session.Close()
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
	return s.session.WindowChange(rows, cols) // WindowChange expects (rows, cols)
}

func (s *Session) Close() error {
	if s.stdin != nil {
		s.stdin.Close()
	}
	return s.session.Close()
}
