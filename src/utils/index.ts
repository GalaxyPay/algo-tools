import algosdk from "algosdk";
import { toast } from "vue-sonner";

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

export async function execAtc(
  atc: algosdk.AtomicTransactionComposer,
  algodClient: algosdk.Algodv2,
  success: string
) {
  const store = useAppStore();
  let toastId: number | string | undefined = undefined;
  try {
    store.overlay = true;
    toastId = toast.info("Awaiting Signatures...", {
      duration: Infinity,
    });
    await atc.gatherSignatures();
    toast.dismiss(toastId);
    toastId = toast.info("Processing...", {
      duration: Infinity,
    });
    await atc.execute(algodClient, 4);
    toast.dismiss(toastId);
    toast.success(success);
    store.refresh++;
    store.overlay = false;
  } catch (err) {
    store.overlay = false;
    toast.dismiss(toastId);
    throw err;
  }
}

export function ipfs2http(url: string) {
  const ipfsGateway = "https://ipfs.algonode.dev/ipfs/";
  return url.replace("ipfs://", ipfsGateway);
}

export function bigintAmount(amt: number, dec: number | bigint) {
  return BigInt(Math.round(amt * 10 ** Number(dec)));
}
