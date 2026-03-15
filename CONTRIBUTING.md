# Contributing to OpenMail docs

Thanks for helping improve the OpenMail documentation! Contributions of all kinds are welcome — fixing typos, clarifying explanations, adding examples, or documenting new features.

## Quick edits

The fastest way to fix something small:

1. Find the page at [docs.openmail.sh](https://docs.openmail.sh)
2. Click **Edit this page** (pencil icon in the footer)
3. Make your edit directly on GitHub and open a pull request

## Local development

For larger changes, run the docs site locally:

```bash
git clone https://github.com/openmailsh/docs.git
cd docs
npm install
npm run dev
```

Preview at [http://localhost:3000](http://localhost:3000).

## Making changes

1. Fork the repo and create a branch: `git checkout -b fix/clarify-webhook-events`
2. Edit the relevant `.mdx` files
3. Check for broken links: `npm run broken-links`
4. Open a pull request against `main`

## Content guidelines

- Use active voice: "Run the command" not "The command should be run"
- Address the reader directly with "you"
- Keep sentences concise — one idea per sentence
- Lead with the goal before the steps
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and inline code

## What to contribute

- Fixing typos or unclear wording
- Adding code examples
- Documenting edge cases you discovered
- Translating error messages into actionable steps
- Flagging outdated content (open an issue)

## Reporting issues

If something in the docs is wrong or missing, [open an issue](https://github.com/openmailsh/docs/issues/new) describing what's incorrect and what it should say.
