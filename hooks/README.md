# Hooks

These scripts provide local quality gates for DesignRail's agent-assisted workflow.

## Scripts

- `quality-gate.sh`: full local package check sequence.
- `pre-agent-finish.sh`: final gate before an agent hands work back.
- `pre-commit.sh`: focused local commit gate.
- `no-secrets.sh`: scans tracked text for common secrets and private tokens.
- `mock-mode-check.sh`: guards the mock-mode-first default path.

## Usage

Run the full gate:

```sh
bash hooks/quality-gate.sh
```

Install the commit hook locally:

```sh
cp hooks/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Instructions guide the agent. Deterministic checks enforce quality.
