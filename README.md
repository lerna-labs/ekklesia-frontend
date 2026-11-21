# Ekklesia Voting Frontend

A modern web application for verifiable on-chain voting on Cardano. This platform enables voters (DReps, SPOs and other voter types defined by the backend) to participate in polls and ballots using CIP-95 compatible wallets or CardanoSigner.

## Features

- **Ballot Management**: View upcoming, live, and closed ballots
- **Voting**: Cast votes using CIP-95 wallets or CardanoSigner
- **Voter Directory**: Public directory of voters and their voting history
- **Real-time Updates**: Voting power and results updated every 10 minutes
- **Wallet Integration**: Support for multiple Cardano wallet providers
- **On-chain Verification**: All votes are verifiable on-chain

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) 2.x
- **UI Library**: [Svelte](https://svelte.dev/) 5 (with Runes)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn-svelte](https://shadcn-svelte.com/)
- **Build Tool**: [Vite](https://vitejs.dev/) 6
- **Adapter**: `@sveltejs/adapter-static` (static site generation)
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **Notifications**: [svelte-sonner](https://github.com/wobsoriano/svelte-sonner)

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher (or compatible package manager)
- **Backend API**: A running Ekklesia backend API instance

## Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd ekklesia-frontend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) section):

   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**:
   Edit `.env` and fill in the required values for your environment.

## Environment Variables

The app calls the API at `/api` and the health check at `/health` on the page's own origin, so no API URL is configured. The wallet signer types, the default type, the multisig switch and the network come from the backend's `GET /api/v1/config` at run time.

Create a `.env` file in the root directory to customize branding (see `.env.example` for every variable). `VITE_APP_URL` is the canonical URL of the deployment and is the only variable a release build needs.

During `npm run dev` the Vite dev server proxies `/api` and `/health` to `http://localhost:3000`. To use another backend, set `DEV_BACKEND_URL` in `.env`:

```env
DEV_BACKEND_URL=http://localhost:3000
```

**Note**: `VITE_APP_VERSION` is automatically set from `package.json` during build and does not need to be configured.

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:preprod` - Build for pre-production environment
- `npm run preview` - Preview production build locally
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint and check code formatting
- `npm run test` - Run the test suite with Vitest

## Testing

Run the test suite:

```bash
npm run test
```

Tests run under Vitest with jsdom. Component tests mount `.svelte` files with `@testing-library/svelte`, and the `$lib` and `$stores` aliases resolve as in the application. `vitest.setup.js` unmounts components after each test and stubs `$app/stores` and `$app/navigation`; a test that needs a specific page value or a navigation spy overrides the stub with its own `vi.mock`. Pure-logic tests that need no DOM can opt out of jsdom with a `// @vitest-environment node` comment on the first line.

## Building for Production

Build the static site:

```bash
npm run build
```

The output will be in the `build/` directory, ready to be served by any static file server or integrated into an Express backend.

## Releasing

Merging a promotion into `main` makes the release workflow open or update the `chore: release` pull request. Merging that pull request does not tag or publish anything. The maintainer then creates a signed annotated tag at the version commit on `main` and pushes it:

```bash
git fetch origin main
git tag -s vX.Y.Z -m "vX.Y.Z" <version-commit-sha>
git push origin vX.Y.Z
```

The tag push starts the publish workflow. Its first job refuses to continue unless the tag is an annotated tag of a commit, GitHub reports its signature as verified, the signed tag's commit is the pushed commit, that commit is an ancestor of `main`, and the tag is `v` followed by the version in `package.json` at that commit. When `GITHUB_SHA` is unset, as in a manual run against a tag already pushed, the signed tag's own commit is used. It then builds the production tarball and creates the GitHub Release with the changelog section as notes, skipping creation if the release already exists. You can run the check locally with `GITHUB_REPOSITORY=lerna-labs/ekklesia-frontend GH_TOKEN=$(gh auth token) .github/scripts/verify-release-tag.sh vX.Y.Z`.

## Project Structure

```text
ekklesia-frontend/
├── src/
│   ├── lib/                    # Reusable components and utilities
│   │   ├── base/              # Base UI components (Header, Footer, etc.)
│   │   ├── components/        # UI component library (shadcn-svelte)
│   │   └── WalletSigner/      # Wallet integration components
│   ├── routes/                # SvelteKit routes
│   │   ├── ballots/          # Ballot listing and detail pages
│   │   ├── voter-directory/  # Voter directory pages
│   │   └── (private)/        # Protected routes (dashboard)
│   ├── stores/                # Svelte stores (session management, etc.)
│   └── app.css               # Global styles
├── static/                    # Static assets (images, icons, etc.)
└── build/                    # Build output directory
```

## Key Features Implementation

### Wallet Integration

The application supports multiple Cardano wallet providers:

- CIP-95 compatible wallets (Eternl, begin, Vespr, etc.)
- CardanoSigner for offline signing

Wallet integration is handled in `src/lib/WalletSigner/` components.

### Authentication

Authentication is managed via JWT tokens stored in cookies and localStorage. Session management is handled in `src/stores/sessionManager.js`.

### Routing

The application uses SvelteKit's file-based routing:

- Client-side rendering (CSR) mode enabled
- Server-side rendering (SSR) disabled
- Static site generation for production builds

## Before Opening a Pull Request

Run these locally; CI runs the same three, in this order:

```bash
npm run lint
npm run test
npm run build
```

If the change is user-facing, add a changelog entry:

```bash
npm run changeset
```

## License

Apache 2.0

## Support

For issues and questions, please refer to [the main Ekklesia repository](https://github.com/Lerna-Labs/ekklesia/issues)
