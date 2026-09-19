"""Direct-mode tests for the Corroborate contract."""

import json

CONTRACT = "contracts/corroborate.py"


def _mock_check(
    vm,
    coingecko_id: str,
    symbol: str,
    price_a: float | None,
    price_b: float | None,
    *,
    a_ok: bool = True,
    b_ok: bool = True,
):
    """Mocks CoinGecko's simple/price endpoint and Coinbase's spot endpoint
    for one check() call. Pass a_ok/b_ok=False to simulate that source
    failing to return usable data.
    """
    vm.clear_mocks()

    if a_ok:
        body_a = json.dumps({coingecko_id: {"usd": price_a}})
        status_a = 200
    else:
        body_a = json.dumps({"error": "not found"})
        status_a = 404
    vm.mock_web(
        r"api\.coingecko\.com/api/v3/simple/price\?ids=" + coingecko_id,
        {"method": "GET", "status": status_a, "body": body_a},
    )

    if b_ok:
        body_b = json.dumps({"data": {"amount": str(price_b), "base": symbol, "currency": "USD"}})
        status_b = 200
    else:
        body_b = json.dumps({"errors": [{"id": "not_found"}]})
        status_b = 404
    vm.mock_web(
        r"api\.coinbase\.com/v2/prices/" + symbol + r"-USD/spot",
        {"method": "GET", "status": status_b, "body": body_b},
    )


def test_check_corroborated_when_prices_agree(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_check(direct_vm, "ethereum", "ETH", 2477.51, 2481.20)
    contract.check("ETH")

    record = contract.get_latest("ETH")
    assert record.symbol == "ETH"
    assert record.source_a_price_micros == 2_477_510_000
    assert record.source_b_price_micros == 2_481_200_000
    assert record.corroborated is True
    assert record.deviation_bps <= 150
    assert record.checked_at > 0


def test_check_diverged_when_prices_disagree_beyond_tolerance(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_check(direct_vm, "ethereum", "ETH", 2000.00, 2500.00)
    contract.check("ETH")

    record = contract.get_latest("ETH")
    assert record.corroborated is False
    assert record.deviation_bps > 150


def test_check_is_case_insensitive_on_symbol(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_check(direct_vm, "bitcoin", "BTC", 60000.0, 60100.0)
    contract.check("btc")

    record = contract.get_latest("BTC")
    assert record.symbol == "BTC"


def test_check_unsupported_symbol_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("not a supported asset"):
        contract.check("DOGE")


def test_check_reverts_cleanly_when_one_source_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_check(direct_vm, "ethereum", "ETH", 2477.51, None, b_ok=False)

    with direct_vm.expect_revert("Could not fetch prices from both sources"):
        contract.check("ETH")

    with direct_vm.expect_revert("No check recorded yet"):
        contract.get_latest("ETH")


def test_check_reverts_cleanly_when_the_other_source_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_check(direct_vm, "ethereum", "ETH", None, 2481.20, a_ok=False)

    with direct_vm.expect_revert("Could not fetch prices from both sources"):
        contract.check("ETH")


def test_get_latest_unknown_symbol_fails(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("No check recorded yet"):
        contract.get_latest("ETH")


def test_get_history_accumulates_across_symbols(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_check(direct_vm, "ethereum", "ETH", 2477.51, 2481.20)
    contract.check("ETH")

    _mock_check(direct_vm, "bitcoin", "BTC", 60000.0, 60100.0)
    contract.check("BTC")

    _mock_check(direct_vm, "ethereum", "ETH", 2500.00, 2505.00)
    contract.check("ETH")

    history = contract.get_history()
    assert len(history) == 3
    assert [h.symbol for h in history] == ["ETH", "BTC", "ETH"]


def test_get_supported_symbols_lists_the_allowlist(direct_deploy):
    contract = direct_deploy(CONTRACT)
    assert set(contract.get_supported_symbols()) == {"ETH", "BTC", "SOL"}
