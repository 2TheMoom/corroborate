import { createClient } from "genlayer-js";
import { getGenLayerChain } from "../genlayer/chains";
import type { PriceCheck } from "./types";
import {
  estimateWriteFeePreset,
  feePresetToTransactionFees,
  type FeePresetEstimate,
  type FeePresetLevel,
} from "../genlayer/fees";

/**
 * genlayer-js decodes Python dataclasses (and dicts) as JS Map instances,
 * keyed by field name. This flattens one level of the Map into a plain
 * object.
 */
function toPlainObject(raw: any): Record<string, any> {
  const entries = raw instanceof Map ? Array.from(raw.entries()) : Object.entries(raw ?? {});
  const obj: Record<string, any> = {};
  for (const [key, value] of entries) {
    obj[key] = value;
  }
  return obj;
}

function decodePriceCheck(raw: any): PriceCheck {
  const obj = toPlainObject(raw);
  return {
    symbol: String(obj.symbol ?? ""),
    source_a_price_micros: String(obj.source_a_price_micros ?? "0"),
    source_b_price_micros: String(obj.source_b_price_micros ?? "0"),
    deviation_bps: String(obj.deviation_bps ?? "0"),
    corroborated: Boolean(obj.corroborated),
    checked_at: String(obj.checked_at ?? "0"),
  };
}

/**
 * Corroborate contract class - a cross-source price-agreement oracle with
 * no LLM anywhere. check(symbol) is the only write method; it fetches
 * CoinGecko and Coinbase independently and reaches consensus on whether
 * they agree within tolerance. It moves no value.
 */
class Corroborate {
  private contractAddress: `0x${string}`;
  private client: any;
  private rpcUrl?: string;

  constructor(contractAddress: string, address?: string | null, rpcUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.rpcUrl = rpcUrl;

    const config: any = { chain: getGenLayerChain() };
    if (address) config.account = address as `0x${string}`;
    if (rpcUrl) config.endpoint = rpcUrl;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = { chain: getGenLayerChain(), account: address as `0x${string}` };
    if (this.rpcUrl) config.endpoint = this.rpcUrl;
    this.client = createClient(config);
  }

  async estimateCheckFees(
    symbol: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      { address: this.contractAddress, functionName: "check", args: [symbol] },
      level,
    );
  }

  async getLatest(symbol: string): Promise<PriceCheck | null> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress, functionName: "get_latest", args: [symbol],
      });
      return decodePriceCheck(result);
    } catch {
      return null;
    }
  }

  async getHistory(): Promise<PriceCheck[]> {
    const result: any = await this.client.readContract({
      address: this.contractAddress, functionName: "get_history", args: [],
    });
    return Array.isArray(result) ? result.map(decodePriceCheck) : [];
  }

  async getSupportedSymbols(): Promise<string[]> {
    const result: any = await this.client.readContract({
      address: this.contractAddress, functionName: "get_supported_symbols", args: [],
    });
    return Array.isArray(result) ? result.map(String) : [];
  }

  async check(
    symbol: string,
    feePreset?: FeePresetEstimate,
    onSubmitted?: (txHash: string) => void
  ): Promise<string> {
    const fees = feePresetToTransactionFees(feePreset);
    let txHash: string;
    try {
      txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "check",
        args: [symbol],
        value: BigInt(0),
        ...(fees ? { fees } : {}),
      });
    } catch (error) {
      console.error("Error calling check:", error);
      throw new Error("Failed to submit the check transaction. Please try again.");
    }

    onSubmitted?.(txHash);

    try {
      await this.client.waitForTransactionReceipt({ hash: txHash, status: "ACCEPTED" as any, retries: 40, interval: 5000 });
      return txHash;
    } catch (error) {
      console.error("Error confirming check transaction:", error);
      throw new Error(
        `Transaction ${txHash} was submitted but confirmation timed out. It may still complete - check the explorer.`
      );
    }
  }
}

export default Corroborate;
