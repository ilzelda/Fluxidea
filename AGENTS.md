# AGENTS.md

This file gives AI coding agents project-specific guidance for working in this repository.

## Project Direction

FluxIdea is a tool for arranging and visualizing ideas in a way that feels closer to natural thinking than a linear outline. The product should help users place concepts freely, connect them, and explore relationships through an intuitive spatial interface.

When implementing changes, preserve these product principles:

- Support non-linear thinking. Avoid forcing every idea into a strict tree, list, or single parent hierarchy unless the user explicitly asks for that mode.
- Make relationships visible and manipulable. Nodes and connections are the core interaction model, so changes should strengthen creation, editing, navigation, organization, and persistence of graphs.
- Keep the canvas direct and lightweight. The first interaction should remain about working with ideas, not managing forms, settings, or onboarding screens.
- Treat 2D and 3D views as ways to understand the same graph. Do not let one view silently diverge in data shape or behavior from the other.
- Prefer flexible spatial layout over rigid automation. Auto-arrange features should help the user recover structure while still allowing manual positioning afterward.

## Major Directories

- `cmd/`: Go application entrypoint. `cmd/main.go` loads environment/config, initializes logging, registers APIs, and starts the HTTP server.
- `pkg/config/`: Application configuration loading and typed config models.
- `pkg/log/`: Logger initialization and shared logger setup.
- `pkg/server/`: HTTP server setup and static file serving. The configured `root_path` points to the static frontend.
- `pkg/apis/`: API composition and route registration. `pkg/apis/apis.go` wires auth, page, and user handlers.
- `pkg/apis/internal/auth/`: Authentication flow, claims, middleware, and OAuth-related behavior.
- `pkg/apis/internal/page/`: Page graph API. Handlers expose CRUD endpoints for saved idea pages, and repositories persist page data.
- `pkg/apis/internal/user/`: User API, usecase, model, and repository code.
- `static/`: Browser frontend. `index.html`, `style.css`, and the JavaScript modules implement the canvas UI, graph editing, API calls, auth controls, and 2D/3D rendering.
- `data/`: Local filesystem-backed runtime data for users and pages. Treat it as mutable app data, not source code.
- `config/`: Environment and JSON config files for local and production-like runs.
- `db/`: Reserved for database-related assets or future persistence work.

## Agent Implementation Guidelines

- Read `README.md` before making product-facing changes. Use it as the north star for feature shape and interaction choices.
- Keep graph data simple and explicit: nodes should carry identity, position, text, and render-derived size; connections should reference start/end nodes and carry relationship text.
- When touching persistence, keep frontend serialization in `static/api.js` aligned with backend page models and repository behavior.
- When adding API behavior, register routes through the existing handler pattern in `pkg/apis`, keep middleware composition explicit, and return JSON consistently for API responses.
- Keep unauthenticated/local usage in mind. The frontend currently supports a temporary local page path via `localStorage`; do not break this path when changing page creation, loading, or saving.
- Use the existing vanilla JavaScript module style in `static/`. Avoid introducing a frontend framework or build step unless the task clearly requires it.
- Keep rendering changes coordinated across `static/main.js`, `static/ui.js`, and `static/event.js`. Canvas state, event handling, and graph state are tightly coupled.
- For 3D work, use Three.js consistently with the existing `static/ui.js` approach, and make sure node/connection meaning remains understandable rather than purely decorative.
- Avoid large unrelated rewrites. This project is still compact; small, readable changes are easier to validate than broad restructuring.
- Do not commit secrets from `config/.env` or `config/local/.env`. Treat env files as local configuration.

## UX/Product Decision Criteria

Before choosing an implementation, ask:

- Does this help users capture a loose idea quickly without deciding its final structure first?
- Does it make relationships between concepts easier to see, create, rename, remove, or reorganize?
- Can the user recover from mistakes without losing their graph or spatial context?
- Does the UI stay focused on the canvas and side/page controls instead of becoming a dashboard or marketing page?
- Does mobile behavior preserve the core graph workflow, even if it exposes fewer controls at once?
- Are loading, error, and empty states understandable in Korean, matching the current UI tone?

## Change Checklist

For meaningful changes, check the relevant items before finishing:

- Run `gofmt` on changed Go files.
- Run `go test ./...` when backend code changes.
- Run `make run` or `go run cmd/main.go` when server startup behavior changes.
- Manually verify key graph flows when frontend behavior changes: create node, connect nodes, delete node/connection, organize, save/load page, switch theme, and switch view mode.
- Confirm data compatibility for existing saved page files under `data/page` when changing node or connection shape.
- Check both logged-in API behavior and unauthenticated `localStorage` behavior when changing page APIs or frontend persistence.
