# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from genlayer import *

TOLERANCE_BPS = 150  # 1.5%

SOURCE_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# Contract-owned allowlist: symbol -> (CoinGecko id, Coinbase pair base).
# Callers only ever supply the symbol key, never a URL.
SUPPORTED_ASSETS = {
    "ETH": "ethereum",
    "BTC": "bitcoin",
    "SOL": "solana",
}


@allow_storage
@dataclass
class PriceCheck:
    symbol: str
    source_a_price_micros: u256  # CoinGecko, price * 1_000_000
    source_b_price_micros: u256  # Coinbase, same scale
    deviation_bps: u256
    corroborated: bool
    checked_at: u256


class Corroborate(gl.Contract):
    latest: TreeMap[str, PriceCheck]
    history: DynArray[PriceCheck]

    def __init__(self):
        pass

    def _fetch_coingecko(self, coingecko_id: str) -> int | None:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coingecko_id}&vs_currencies=usd"
        try:
            resp = gl.nondet.web.request(url, method="GET", headers=SOURCE_HEADERS)
            data = json.loads((resp.body or b"").decode("utf-8"))
            price = data[coingecko_id]["usd"]
            return round(float(price) * 1_000_000)
        except (ValueError, KeyError, TypeError, AttributeError):
            return None

    def _fetch_coinbase(self, symbol: str) -> int | None:
        url = f"https://api.coinbase.com/v2/prices/{symbol}-USD/spot"
        try:
            resp = gl.nondet.web.request(url, method="GET", headers=SOURCE_HEADERS)
            data = json.loads((resp.body or b"").decode("utf-8"))
            price = data["data"]["amount"]
            return round(float(price) * 1_000_000)
        except (ValueError, KeyError, TypeError, AttributeError):
            return None

    def _deviation_bps(self, price_a: int, price_b: int) -> int:
        larger = max(price_a, price_b)
        if larger == 0:
            return 0
        return round(abs(price_a - price_b) * 10_000 / larger)

    def _consensus_check(self, symbol: str, coingecko_id: str) -> dict:
        def leader_fn() -> dict:
            price_a = self._fetch_coingecko(coingecko_id)
            price_b = self._fetch_coinbase(symbol)
            if price_a is None or price_b is None:
                return {"ok": False}
            deviation = self._deviation_bps(price_a, price_b)
            return {
                "ok": True,
                "price_a": price_a,
                "price_b": price_b,
                "deviation_bps": deviation,
                "corroborated": deviation <= TOLERANCE_BPS,
            }

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            my_result = leader_fn()
            if my_result["ok"] != leaders_res.calldata["ok"]:
                return False
            if not my_result["ok"]:
                return True
            return my_result["corroborated"] == leaders_res.calldata["corroborated"]

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    @gl.public.write
    def check(self, symbol: str) -> None:
        ticker = symbol.strip().upper()
        coingecko_id = SUPPORTED_ASSETS.get(ticker)
        if coingecko_id is None:
            raise gl.vm.UserError(f"'{ticker}' is not a supported asset")
        result = self._consensus_check(ticker, coingecko_id)
        if not result.get("ok"):
            raise gl.vm.UserError("Could not fetch prices from both sources")
        now = int(datetime.now(timezone.utc).timestamp())
        record = PriceCheck(
            symbol=ticker,
            source_a_price_micros=int(result["price_a"]),
            source_b_price_micros=int(result["price_b"]),
            deviation_bps=int(result["deviation_bps"]),
            corroborated=bool(result["corroborated"]),
            checked_at=now,
        )
        self.latest[ticker] = record
        self.history.append(record)

    @gl.public.view
    def get_latest(self, symbol: str) -> PriceCheck:
        ticker = symbol.strip().upper()
        record = self.latest.get(ticker)
        if record is None:
            raise gl.vm.UserError(f"No check recorded yet for '{ticker}'")
        return record

    @gl.public.view
    def get_history(self) -> list:
        return list(self.history)

    @gl.public.view
    def get_supported_symbols(self) -> list:
        return list(SUPPORTED_ASSETS.keys())
