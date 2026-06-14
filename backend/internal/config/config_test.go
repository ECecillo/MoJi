package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_DefaultsWhenNoEnv(t *testing.T) {
	t.Setenv("SINO_HOST", "")
	t.Setenv("SINO_PORT", "")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "127.0.0.1", cfg.Host)
	assert.Equal(t, 8787, cfg.Port)
	assert.Equal(t, "127.0.0.1:8787", cfg.Addr())
	assert.Empty(t, cfg.APIToken) // auth désactivée par défaut
}

func TestLoad_APITokenFromEnv(t *testing.T) {
	t.Setenv("SINO_API_TOKEN", "s3cret-token")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "s3cret-token", cfg.APIToken)
}

func TestLoad_OverridesFromEnv(t *testing.T) {
	t.Setenv("SINO_HOST", "0.0.0.0")
	t.Setenv("SINO_PORT", "9999")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "0.0.0.0", cfg.Host)
	assert.Equal(t, 9999, cfg.Port)
}

func TestLoad_RejectsInvalidPort(t *testing.T) {
	t.Setenv("SINO_PORT", "not-a-number")

	_, err := Load()
	require.Error(t, err)
}
