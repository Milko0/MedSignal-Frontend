# core

App-wide configuration and constants.

## Tools used

- Vite env variables (`import.meta.env`)

## Rules

- No imports from other layers.

## Contents

| Item | Role |
|---|---|
| `config/env.js` | API base URL |
| `constants/disclaimer.js` | NFR-11 text |
| `constants/status.js` | Status labels and palette tones |
| `constants/auth.js` | `FORM_401_PATHS`: requests whose 401 is a form error, not a session expiry |
