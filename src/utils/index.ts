import Algo from "@/services/Algo";
import { AtomicTransactionComposer } from "algosdk";

export { getAssetInfo } from "./assetInfo";
export { resolveProtocol } from "./resolveProtocol";

export function formatAddr(addr: string | null, length: number = 5) {
  if (!addr) return "";
  return `${addr?.substring(0, length)}...${addr?.substring(58 - length)}`;
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchAsync(url: string) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch {
    // console.error(err)
  }
}

export async function execAtc(atc: AtomicTransactionComposer, success: string) {
  const store = useAppStore();
  store.setSnackbar("Awaiting Signatures...", "info", -1);
  await atc.gatherSignatures();
  store.setSnackbar("Processing...", "info", -1);
  await atc.execute(Algo.algod, 4);
  store.setSnackbar(success, "success");
  store.refresh++;
}

export function ipfs2http(url: string) {
  const ipfsGateway = "https://ipfs.algonode.xyz/ipfs/";
  return url.replace("ipfs://", ipfsGateway);
}

export function bigintAmount(amt: number, dec: number | bigint) {
  return BigInt(Math.round(amt * 10 ** Number(dec)));
}
