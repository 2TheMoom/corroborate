"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Corroborate from "../contracts/Corroborate";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type { PriceCheck } from "../contracts/types";

export function useCorroborateContract(): Corroborate | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const rpcUrl = getStudioUrl();

  const contract = useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        { label: "Setup Guide", onClick: () => window.open("/docs/setup", "_blank") }
      );
      return null;
    }
    return new Corroborate(contractAddress, address, rpcUrl);
  }, [contractAddress, address, rpcUrl]);

  return contract;
}

export function useLatest(symbol: string) {
  const contract = useCorroborateContract();

  return useQuery<PriceCheck | null, Error>({
    queryKey: ["latest", symbol],
    queryFn: () => (contract ? contract.getLatest(symbol) : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!symbol,
  });
}

export function useHistory() {
  const contract = useCorroborateContract();

  return useQuery<PriceCheck[], Error>({
    queryKey: ["history"],
    queryFn: () => (contract ? contract.getHistory() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useSupportedSymbols() {
  const contract = useCorroborateContract();

  return useQuery<string[], Error>({
    queryKey: ["supportedSymbols"],
    queryFn: () => (contract ? contract.getSupportedSymbols() : Promise.resolve([])),
    staleTime: 60000,
    enabled: !!contract,
  });
}

export function useCheck() {
  const contract = useCorroborateContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (symbol: string) => {
      if (!contract) throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      if (!address) throw new Error("Wallet not connected. Please connect your wallet to run a check.");
      setIsChecking(true);
      setPendingTxHash(null);
      const feePreset = await contract.estimateCheckFees(symbol, "standard");
      return contract.check(symbol, feePreset, setPendingTxHash);
    },
    onSuccess: (_data, symbol) => {
      queryClient.invalidateQueries({ queryKey: ["latest", symbol] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      setIsChecking(false);
      success("Check complete!", { description: "The verdict is now on-chain." });
    },
    onError: (err: any) => {
      console.error("Error checking:", err);
      setIsChecking(false);
      error("Check failed", { description: err?.message || "Please try again." });
    },
  });

  return {
    ...mutation,
    isChecking,
    pendingTxHash,
    clearPendingTx: () => setPendingTxHash(null),
    check: mutation.mutate,
  };
}
