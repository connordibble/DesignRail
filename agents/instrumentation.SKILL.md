# Instrumentation Skill

## Use when

Work adds or changes analytics, audit events, logs, metrics, or review workflow telemetry.

## Goal

Capture useful operational signals without collecting private or unnecessary data.

## Rules

- Track workflow events such as import, mapping generated, compliance reviewed, decision saved, edit made, and export created.
- Prefer stable event names and typed payloads.
- Do not log secrets, raw private design files, or personal data.
- Include enough context to debug decisions without exposing sensitive source data.
- Keep instrumentation optional in mock mode.
