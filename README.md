# Subdir Reverse Proxy

A lightweight reverse proxy built with Next.js, designed to proxy requests from a subdirectory path to a target URL. Deployable to Webflow Cloud.

## Use Case

This proxy is useful when you want to serve content from an external URL under a subdirectory of your domain. For example, you can proxy `yourdomain.com/help` to `external-helpdesk.com/help`, making the external content appear as part of your site.

## Features

- Proxies all HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Forwards request headers and body
- Handles hop-by-hop headers correctly
- Preserves query strings
- Handles redirects manually to maintain proxy integrity
- Deployable to Webflow Cloud for edge performance

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Set your target URL in `.env`:

```env
PROXY_TARGET_URL=https://www.example.com/help
```

3. Update `next.config.js` to match your desired subdirectory path:

```js
const nextConfig = {
  basePath: "/help",
  assetPrefix: "/help",
};
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Webflow Cloud Deployment

This project is configured to deploy to Webflow Cloud using [OpenNext](https://opennext.js.org/).

Preview locally:

```bash
npm run preview
```

Make sure to set the `PROXY_TARGET_URL` environment variable in your local and deployed environments.

## Configuration Files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js configuration with basePath and assetPrefix |
| `wrangler.jsonc` | Cloudflare Workers configuration |
| `open-next.config.ts` | OpenNext configuration for Cloudflare |

## License

MIT License - see [LICENSE.md](LICENSE.md) for details.
