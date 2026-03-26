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
