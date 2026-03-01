# Kizuku 築く

**The desktop design tool that sets your files free.**

Kizuku is a native desktop application for UI/UX design. Import your Figma files, work offline, and own your designs — no subscriptions, no cloud dependency.

Built on [PenPot](https://penpot.app)'s open-source design engine.

---

## Features

- **Figma Import** — Drag and drop `.fig` files to convert them instantly
- **Offline-First** — No internet connection required after setup
- **True Ownership** — All files stored locally in `.kizuku` format
- **Native Desktop** — Full macOS, Windows, and Linux support with menus, shortcuts, and system integration
- **Design Tools** — Components, auto-layout, grids, typography, vector editing, and more (powered by PenPot)

---

## Quick Start

> Detailed setup instructions: [Getting Started Guide](docs/GETTING_STARTED.md)

### Prerequisites

- Node.js 18+
- Docker Desktop
- Git

### Install & Run

```bash
git clone --recurse-submodules https://github.com/ollehca/Kizuku.git
cd Kizuku
npm install

# Start everything (PenPot engine + Kizuku app)
./scripts/start-kizuku.sh
```

### Set Up a Demo License

```bash
KIZUKU_LICENSE_SECRET='test-secret-key-for-testing-only' node scripts/setup-demo-license.js
```

---

## Development

| Command | Purpose |
|---------|---------|
| `npm start` | Launch the app |
| `npm test` | Run tests (304 tests) |
| `npm run lint` | Lint with auto-fix |
| `npm run lint:check` | Lint check only |
| `npm run format` | Format with Prettier |

### Project Structure

```
src/
├── main.js                  # Electron main process
├── preload.js               # API interceptor + IPC bridge
├── services/
│   ├── penpot-mock-backend.js   # Local API server
│   └── figma/                   # Figma import pipeline
└── frontend-integration/        # PenPot UI customizations

test/          # Unit and integration tests
scripts/       # Setup and maintenance scripts
docs/          # Architecture and reference docs
penpot/        # PenPot submodule (design engine)
```

See [docs/](docs/) for architecture details, file format specs, and contributor guides.

---

## License

- **Kizuku** — MIT License
- **PenPot** — MPL 2.0
