# PDF Package

Thin puppeteer wrapper. Takes HTML, returns PDF bytes.

## Rules

1. No imports from `@builders/*`. This package sits alongside `@builders/lib` as pure infra.
2. No business logic. No conditionals on data shape. No domain knowledge.
3. Public surface is `renderHtmlToPdf(html, options) → Promise<Uint8Array>`. HTML is built upstream by domain message builders.
4. Browser launch flags live here (headless, `--no-sandbox` for containerized Railway runs). All other render options pass through to puppeteer.
5. If browser lifecycle becomes a hot path, introduce caching/pooling inside this package — keep the public surface stable.
