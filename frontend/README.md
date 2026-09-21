# Corroborate Frontend

Next.js frontend for Corroborate - a cross-source price-agreement oracle on
GenLayer, no LLM. Reads and writes the deployed `Corroborate` contract on
**GenLayer Bradbury Testnet** (chain ID 4221).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` - your deployed Corroborate contract address
   - `NEXT_PUBLIC_GENLAYER_RPC_URL` - Bradbury RPC (default: `https://rpc-bradbury.genlayer.com`)
   - `NEXT_PUBLIC_GENLAYER_CHAIN_ID` - must stay `4221` (Bradbury), consistent with the RPC URL above

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **genlayer-js** - GenLayer blockchain SDK
- **TanStack Query (React Query)** - Data fetching and caching
- **Radix UI** - Accessible component primitives

## Wallet

Connects via MetaMask (or any injected EIP-1193 provider) and prompts the
user to add/switch to the GenLayer Bradbury Testnet if needed. No private
keys are ever generated, imported, or stored by this app.

## Features

- **Live balance-scale hero**: the latest on-chain check for a selected
  asset (ETH/BTC/SOL), driven by real `get_latest` reads
- **Check Now**: submits a real `check(symbol)` transaction - validators
  independently fetch CoinGecko and Coinbase and reach consensus on the
  verdict
- **The Log**: every check ever recorded, read from `get_history`
