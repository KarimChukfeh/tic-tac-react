# Tic Tac React

**Provably Fair • Zero Trust • 100% On-Chain**

A decentralized Tic-Tac-Toe game built on Ethereum. Play with real stakes where every move is a transaction and every game is provably fair.

## Features

- 100% on-chain gameplay
- Provably random first move (coin flip)
- Real ETH stakes
- Winner takes 95% of the pot
- Complete game history tracking
- No servers or operators required

## Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- Hardhat local node running (for local development)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd tic-tac-react
```

2. Install dependencies:
```bash
npm install
```

## Smart Contract Setup

Before running the frontend, you need to deploy the TicTacDuel smart contract:

1. Start Hardhat local node:
```bash
npx hardhat node
```

2. Deploy the contract (in a new terminal):
```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. Update the contract address in `src/App.jsx`:
   - Find the line: `const CONTRACT_ADDRESS = "0x..."`
   - Replace with your deployed contract address

4. Configure MetaMask:
   - Network: Localhost 8545
   - Chain ID: 31337
   - RPC URL: http://localhost:8545

## Running the App

Start the development server:
```bash
npm run dev
```

The app will open in your browser at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` folder.

## How to Play

1. Connect your MetaMask wallet
2. Join a game as Player 1 or Player 2 (0.002 ETH entry fee)
3. Once both players have joined, either player can start the game
4. A provably random coin flip determines who goes first
5. Take turns making moves on the blockchain
6. Winner receives 95% of the pot, house takes 5%
7. In case of a draw, both players receive 45% refund (10% house fee)

## Game Rules

- Entry fee: 0.002 ETH per player
- Winner payout: 95% of total pot
- Draw payout: 45% refund to each player
- House fee: 5% on win, 10% on draw

## Technology Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Blockchain**: ethers.js v6
- **Icons**: Lucide React
- **Smart Contract**: Solidity (Hardhat)

## Project Structure

```
tic-tac-react/
├── src/
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # React entry point
│   ├── index.css         # Global styles + Tailwind
│   └── dummyABI.json     # Smart contract ABI
├── index.html            # HTML template
├── package.json          # Dependencies
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
└── README.md            # This file
```

## License

MIT
