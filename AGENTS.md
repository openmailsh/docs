# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

## OpenAPI spec

The API reference is driven directly by the **live** spec the API serves at
`https://api.openmail.sh/openapi.json` (see the `openapi` field in `docs.json`).
Mintlify fetches it at build time, so the reference pages always match what's
deployed — there is nothing to copy or regenerate in this repo.

**Source of truth is the API repo.** The spec is generated there from the
Fastify route schemas (`apps/api/src/openapi.json`, via `pnpm generate:openapi`
in the `openmail` repo) and served at the URL above. To change an endpoint,
land the schema change in the `openmail` repo; the docs update on the next
build with no action here.

**Nav is still manual.** New endpoints must be added to the API reference nav
groups in `docs.json` (e.g. `"POST /v1/pods/{id}/api-keys"`), or they won't
appear in the sidebar even though the spec knows about them.

## Terminology

<!-- Add product-specific terms and preferred usage -->
<!-- Example: Use "workspace" not "project", "member" not "user" -->

## Style preferences

<!-- Add any project-specific style rules below -->

- Use active voice and second person ("you")
- Keep sentences concise - one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references

## Content boundaries

<!-- Define what should and shouldn't be documented -->
<!-- Example: Don't document internal admin features -->
