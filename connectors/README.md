> Production integration is not implemented. See [Hercules / Convex integration design](docs/hercules-convex-integration.md) for the async persistence boundary, source-verified Vedanta feed contract and release requirements. MemoryStore now requires explicit `allowInMemoryStore: true` for tests/demos, including when supplied explicitly. Custom stores must actually be durable; the runtime cannot certify them. The current Vedanta preset is a legacy mock preset and does not parse the documented kitchen feed.

# Parslia connectors

Company-scoped connector runtime for Parslia Kitchen OS. A subscriber activates a supported system with their own URL, credential, and field mapping. System-specific defaults live in that system's preset. This package is **not** part of the live Hercules deployment and is not deployed from this branch.

- [Activate a connection](docs/activate-a-connection.md)
- [Add a connector](docs/add-a-connector.md)
- [Limitations](docs/limitations.md)

```bash
npm install
npm test
npm run typecheck
```

