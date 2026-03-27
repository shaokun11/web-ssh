package ssh

import "testing"

func TestNormalizeHostForDial_RewritesLoopback_WhenRunningInDocker(t *testing.T) {
	t.Cleanup(func() {
		dockerDetectionFn = isRunningInDocker
	})
	dockerDetectionFn = func() bool { return true }

	tests := []struct {
		name string
		host string
	}{
		{name: "ipv4 loopback", host: "127.0.0.1"},
		{name: "localhost", host: "localhost"},
		{name: "ipv6 loopback", host: "::1"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeHostForDial(tt.host)
			if got != "host.docker.internal" {
				t.Fatalf("expected host.docker.internal, got %q", got)
			}
		})
	}
}

func TestNormalizeHostForDial_DoesNotRewriteNonLoopback_WhenRunningInDocker(t *testing.T) {
	t.Cleanup(func() {
		dockerDetectionFn = isRunningInDocker
	})
	dockerDetectionFn = func() bool { return true }

	got := normalizeHostForDial("192.168.1.10")
	if got != "192.168.1.10" {
		t.Fatalf("expected host unchanged, got %q", got)
	}
}

func TestNormalizeHostForDial_DoesNotRewriteLoopback_WhenNotRunningInDocker(t *testing.T) {
	t.Cleanup(func() {
		dockerDetectionFn = isRunningInDocker
	})
	dockerDetectionFn = func() bool { return false }

	got := normalizeHostForDial("127.0.0.1")
	if got != "127.0.0.1" {
		t.Fatalf("expected host unchanged, got %q", got)
	}
}
