package ccip

import (
	"testing"
	"time"

	cldf "github.com/smartcontractkit/chainlink-deployments-framework/deployment"

	"github.com/stretchr/testify/require"
)

type ChaosConfig struct {
	Namespace                   string
	DashboardUIDs               []string
	WaitBeforeStart             string
	ExperimentFullInterval      string
	ExperimentETHectionInterval string
}

func (l *ChaosConfig) Validate(t *testing.T, e *cldf.Environment) {
	require.NotEmpty(t, l.Namespace, "k8s namespace can't be empty")
	require.NotEmpty(t, l.DashboardUIDs, "dashboard UIDs can't be empty")
	require.NotEmpty(t, l.ExperimentFullInterval, "experiment full interval can't be null, use Go time format 1h2m3s")
	require.NotEmpty(t, l.ExperimentETHectionInterval, "experiment ETHection interval can't be null, use Go time format 1h2m3s")
}

func (l *ChaosConfig) GetWaitBeforeStart() time.Duration {
	w, _ := time.ParseDuration(l.WaitBeforeStart)
	return w
}

func (l *ChaosConfig) GetExperimentInterval() time.Duration {
	ld, _ := time.ParseDuration(l.ExperimentFullInterval)
	return ld
}

func (l *ChaosConfig) GetExperimentETHectionInterval() time.Duration {
	ld, _ := time.ParseDuration(l.ExperimentETHectionInterval)
	return ld
}
