# Corroborate
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/8Jm4v89VAu)
[![Telegram](https://img.shields.io/badge/Telegram--T.svg?style=social&logo=telegram)](https://t.me/genlayer)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/yeagerai.svg?style=social&label=Follow%20%40GenLayer)](https://x.com/GenLayer)

## About
Corroborate is a GenLayer Intelligent Contract that checks whether two
independent price feeds agree on an asset's price - with no LLM anywhere
in the contract. `check(symbol)` has validators fetch CoinGecko and
Coinbase directly, compute the deviation between them in basis points,
and reach consensus on a single deterministic verdict: corroborated (within
tolerance) or diverged.

Like [Handle](https://github.com/2TheMoom/handle), this project
deliberately skips `gl.nondet.exec_prompt`. Where Handle proved GenVM's
non-determinism machinery generalizes to "validators independently
confirm this live fact and agree byte-for-byte," Corroborate proves it
scales to *cross-checking two live facts against each other* - a
different shape of deterministic consensus, still with no judgment call
for an LLM to make.

Only the verdict is consensus-critical. The two raw prices are recorded
as informational context - real-world prices drift between independent
fetches even a few seconds apart, so requiring validators to agree on
the *exact* price (rather than the *verdict about* the price) would make
the contract needlessly flaky. This is the same pattern used for points
in [Summit](https://github.com/2TheMoom/summit) and terms in
[AgentEscrow](https://github.com/2TheMoom/agent-escrow).

The contract alone constructs both source URLs from a small hardcoded
allowlist (`ETH`, `BTC`, `SOL`) - callers only ever supply a symbol, never
a URL. No native value ever moves through this contract.

## Live deployment
Deployed on **GenLayer Bradbury Testnet** (chain ID 4221):
- **Contract:** [`0x6e1D80f0b8aF7fD9c8e35f5fEA865E8A2E9c8e4a`](https://explorer-bradbury.genlayer.com/address/0x6e1D80f0b8aF7fD9c8e35f5fEA865E8A2E9c8e4a)
- **Frontend:** https://corroborate-frontend.vercel.app
- Verified via 9 passing direct-mode tests (`python -m pytest tests/direct/`),
  covering agreement within tolerance, divergence beyond tolerance,
  case-insensitive symbols, an unsupported symbol, either source failing
  cleanly (all-or-nothing, no partial record), an unknown-symbol read,
  and history accumulating correctly across multiple symbols.
- Verified live end-to-end against the real CoinGecko and Coinbase APIs
  (not just direct-mode tests): `check("ETH")` and `check("BTC")` both
  reached full validator consensus and recorded real data on-chain -
  ETH at CoinGecko $2,620.82 vs Coinbase $2,621.38 (2 bps deviation),
  and BTC at CoinGecko $81,044.00 vs Coinbase $81,072.57 (4 bps
  deviation) - both correctly corroborated, confirmed stable on
  independent re-reads of on-chain state.

## What's included
- `contracts/corroborate.py` — the Corroborate Intelligent Contract
- `tests/direct/test_corroborate.py` — direct-mode tests (in-memory, mocked CoinGecko/Coinbase)
- **Contract linting** — static analysis to catch common contract issues before deployment
- **CI pipeline** — GitHub Actions workflow for linting and direct tests
- A Next.js 15 frontend (TypeScript, TanStack Query, Radix UI) — a
  literal balance-scale readout of the latest check, asset tabs for
  ETH/BTC/SOL, and a perforated "printout" log of every check recorded
- Configuration file template and deployment scripts

## Requirements
- Python >= 3.12
- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli) globally installed: `npm install -g genlayer`
- GenLayer Studio (for integration tests and deployment): Install from [Docs](https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup#using-the-genlayer-studio) or use the hosted [GenLayer Studio](https://studio.genlayer.com/)

## Project Structure

```
contracts/              # Python intelligent contracts
  corroborate.py         # Corroborate
tests/
  direct/                # Fast in-memory tests (no Studio required)
    test_corroborate.py
frontend/                # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
deploy/                  # TypeScript deployment scripts
gltest.config.yaml       # Test runner network configuration
pyproject.toml           # Python/pytest configuration
.github/workflows/       # CI pipeline
```

## Quick Start

### 1. Set up Python environment

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Lint the contract

```shell
genvm-lint check contracts/corroborate.py
```

### 3. Run direct mode tests

```shell
python -m pytest tests/direct/ -v
```

Use `python -m pytest`, not bare `pytest` - depending on your installed
pytest version, running the bare command can fail to put the project
root on `sys.path`, breaking test discovery with
`ModuleNotFoundError: No module named 'tests'`.

### 4. Deploy the contract

1. Choose your network: `genlayer network`
2. Deploy: `genlayer deploy` (runs the script in `/deploy/deployScript.ts`)

### 5. Set up the frontend

1. Copy `frontend/.env.example` to `frontend/.env`
2. Add your deployed contract address as `NEXT_PUBLIC_CONTRACT_ADDRESS`
3. Run:

```shell
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3000/.

## How Corroborate Works

1. **`check(symbol)`** — no value moves; `symbol` must be one of the
   hardcoded allowlist (`ETH`, `BTC`, `SOL`). Validators independently
   fetch CoinGecko's `simple/price` endpoint and Coinbase's `spot`
   endpoint for that symbol, compute the deviation in basis points
   relative to the larger price, and reach consensus on whether that
   deviation is within tolerance (150 bps / 1.5%). A `PriceCheck` record
   is written to both `latest[symbol]` and the shared `history` log.
2. **`get_latest(symbol)`** — the most recent check for a symbol.
3. **`get_history()`** — every check ever recorded, across all symbols.
4. **`get_supported_symbols()`** — the allowlist.

## Testing Strategy

| Test Type | Command | Speed | Requires Studio |
|-----------|---------|-------|-----------------|
| **Lint** | `genvm-lint check contracts/corroborate.py` | ~250ms | No |
| **Direct** | `python -m pytest tests/direct/ -v` | ~ms/test | No |

## Community
- **[Discord](https://discord.gg/8Jm4v89VAu)**: Discussions, support, and announcements
- **[Telegram](https://t.me/genlayer)**: Informal chats and quick updates

## Documentation
For detailed information, see our [documentation](https://docs.genlayer.com/).

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
