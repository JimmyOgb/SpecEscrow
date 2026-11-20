import { CHAIN_ID, CHAIN_ID_HEX, GENLAYER_CHAIN_CONFIG } from "./constants";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask or compatible Web3 wallet not detected. Please install MetaMask.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock your wallet.");
  }

  const currentChainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId !== CHAIN_ID_HEX && parseInt(currentChainId, 16) !== CHAIN_ID) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_CHAIN_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  }

  return accounts[0];
}

export async function getConnectedAccount(): Promise<string | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({
      method: "eth_accounts",
    })) as string[];
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
}
