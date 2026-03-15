# OpenMail docs

Documentation for [OpenMail](https://openmail.sh), built with [Mintlify](https://mintlify.com).

## Local development

```bash
pnpm install
pnpm run dev
```

Preview at http://localhost:3000.

## Deployment

Docs deploy to **docs.openmail.sh** via Mintlify:

1. Install the [Mintlify GitHub app](https://dashboard.mintlify.com/settings/organization/github-app)
2. Connect this repo (`openmailsh/docs`)
3. Mintlify auto-deploys on push to main

## Content

- **Guides** - Getting started, Core concepts, Integration
- **API reference** - OpenAPI spec at `api-reference/openapi.json`. Regenerate with `node scripts/generate-openapi.js` if needed.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Local preview |
| `pnpm run validate` | Validate docs build |
| `pnpm run broken-links` | Check for broken links |
| `pnpm run generate:openapi` | Regenerate OpenAPI spec |
