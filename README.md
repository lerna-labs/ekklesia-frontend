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

Create a `.env` file in the root directory with the following variables:

```env
# Base API URL for the backend API
# Example: http://localhost:3000/api or https://api.example.com
VITE_API_URL=

# Server status endpoint URL (external endpoint)
# Used to check server availability and network status
# Example: http://localhost:3000/api/status or https://api.example.com/status
VITE_SERVER_STATUS=

# Cardano Network ID
# Used for wallet connection and signing operations
# Example: 0 (mainnet) or 1 (testnet/preview)
VITE_NETWORK_ID=

# Voter types configuration
# Comma-separated list of allowed voter types
# Available options: drep, stake, pool, addr
# Example: drep,stake,pool,addr or stake,pool
VITE_VOTER_TYPES=
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

## Building for Production

Build the static site:

```bash
npm run build
```

The output will be in the `build/` directory, ready to be served by any static file server or integrated into an Express backend.

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

## License

[Add your license information here]

## Support

For issues and questions, please refer to the project repository or contact the development team.
