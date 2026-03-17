# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

## OpenAPI spec

The API reference is driven by `api-reference/openapi.json`, which is generated from `scripts/generate-openapi.js`.

**Never edit `api-reference/openapi.json` directly.** Always edit the spec object in `scripts/generate-openapi.js`, then regenerate:

```bash
node scripts/generate-openapi.js
```

This writes to two places at once:
- `api-reference/openapi.json` — consumed by Mintlify for the API reference pages
- `../openmail/apps/api/src/openapi.json` — served live at `https://api.openmail.sh/openapi.json`

If the `openmail` repo is not present locally (e.g. in docs-only CI), the API sync is skipped with a warning.

**When to regenerate**: any time you add, remove, or change an endpoint, request/response shape, or error code. Commit both output files together.

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
