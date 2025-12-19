# ETour - On-Chain Gaming Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-One-28A0F0?logo=arbitrum)](https://arbitrum.io/)

**Provably Fair • Zero Trust • 100% On-Chain**

A decentralized gaming platform built on Arbitrum. Play classic games with real stakes where every move is a transaction and every game is provably fair.

## Games

| Game | Description | Entry Fee |
|------|-------------|-----------|
| **Tic-Tac-Chain** | Classic 3x3 grid game | 0.002 ETH |
| **Connect Four** | Drop discs to connect four | 0.002 ETH |
| **Chess** | Full chess implementation | 0.002 ETH |

## Features

- 🎮 **100% On-Chain Gameplay** - Every move is a blockchain transaction
- 🎲 **Provably Random** - Fair coin flip determines first move
- 💰 **Real Stakes** - Play with ETH, winner takes 95%
- 📜 **Complete History** - All games permanently recorded on-chain
- 🔒 **Zero Trust** - No servers, no operators, just smart contracts
- ⚡ **Arbitrum Powered** - Fast transactions, low fees

## Quick Start

### Prerequisites

- Node.js v18+
- MetaMask or compatible Web3 wallet
- ETH on Arbitrum One (for production) or local testnet

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/tic-tac-react.git
cd tic-tac-react

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_NETWORK` | Target network (`localhost` or `arbitrumOne`) | `localhost` |
| `VITE_RPC_URL` | Custom RPC endpoint (optional) | Network default |
| `VITE_TICTACCHAIN_ADDRESS` | TicTacChain contract address | Local default |
| `VITE_CHESS_ADDRESS` | Chess contract address | Local default |
| `VITE_CONNECTFOUR_ADDRESS` | ConnectFour contract address | Local default |

### Network Configuration

**Local Development:**
```env
VITE_NETWORK=localhost
VITE_RPC_URL=http://127.0.0.1:8545
```

**Arbitrum One (Production):**
```env
VITE_NETWORK=arbitrumOne
```

### MetaMask Setup

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Localhost | 412346 | `http://127.0.0.1:8545` |
| Arbitrum One | 42161 | `https://arb1.arbitrum.io/rpc` |

## Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:ui    # Run tests with UI
```

### Running Tests

```bash
# Run all tests
npm run test:run

# Run tests in watch mode
npm run test

# Run with coverage
npm run test:run -- --coverage
```

### Local Blockchain Setup

For local development, you'll need a running blockchain node with deployed contracts. See the [e-tour](https://github.com/your-org/e-tour) repository for contract deployment instructions.

## Deployment

### Static Hosting (Render, Vercel, Netlify)

The project includes `render.yaml` for one-click Render deployment:

```bash
npm run build
# Deploy the `dist` folder
```

### Build Output

Production files are generated in the `dist` directory, ready for any static hosting provider.

## How to Play

1. **Connect Wallet** - Click "Connect Wallet" and approve in MetaMask
2. **Choose Game** - Select Tic-Tac-Chain, Connect Four, or Chess
3. **Join Match** - Pay the entry fee to join as Player 1 or Player 2
4. **Start Game** - Once both players join, start the match
5. **Make Moves** - Each move is recorded on-chain
6. **Claim Victory** - Winner receives 95% of the pot automatically

### Payout Structure

| Outcome | Winner | Loser | House |
|---------|--------|-------|-------|
| Win | 95% | 0% | 5% |
| Draw | 45% | 45% | 10% |

## Project Structure

```
tic-tac-react/
├── src/
│   ├── TicTacChain.jsx      # Tic-Tac-Toe game component
│   ├── Chess.jsx            # Chess game component
│   ├── ConnectFour.jsx      # Connect Four game component
│   ├── Landing.jsx          # Landing page
│   ├── main.jsx             # React entry point
│   ├── index.css            # Global styles (Tailwind)
│   ├── config/
│   │   └── networks.js      # Network & contract configuration
│   ├── utils/
│   │   ├── formatters.js    # Display formatters
│   │   └── matchStatus.js   # Game state utilities
│   ├── components/          # Shared UI components
│   ├── TicTacChainABI.json  # TicTacChain contract ABI
│   ├── COCABI.json          # Chess contract ABI
│   ├── CFOCABI.json         # Connect Four contract ABI
│   └── test/                # Test utilities
├── public/                  # Static assets
├── dist/                    # Production build output
├── .env.example             # Environment template
├── render.yaml              # Render deployment config
├── vite.config.js           # Vite configuration
├── vitest.config.js         # Test configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── package.json             # Dependencies & scripts
```

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, Vite |
| **Styling** | Tailwind CSS |
| **Blockchain** | ethers.js v6 |
| **Network** | Arbitrum One |
| **Icons** | Lucide React |
| **Testing** | Vitest |
| **Deployment** | Render (static) |

## Security

- Smart contracts are the source of truth for all game state
- No backend servers - fully decentralized
- Wallet signatures required for all transactions
- Never share your private keys

### Reporting Vulnerabilities

If you discover a security vulnerability, please email security@your-org.com rather than opening a public issue.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Live Demo](https://etour.your-domain.com)
- [Smart Contracts](https://github.com/your-org/e-tour)
- [Arbiscan](https://arbiscan.io)
