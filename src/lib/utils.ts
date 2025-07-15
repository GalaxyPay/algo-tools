import { networks } from "@/data";
import { useNetwork } from "@txnlab/use-wallet-vue";
import axios from "axios";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

//   return networks.find((n) => n.networkId === activeNetwork.value);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddr(addr: string | undefined, length: number = 6) {
  if (!addr) return "";
  return `${addr?.substring(0, length)}...${addr?.substring(58 - length)}`;
}

export function bigintToString(
  amt: bigint,
  dec: number,
  plain = false,
  round: number | undefined = undefined
): string {
  if (dec < 0 || dec > 19) throw Error("Invalid Decimals");
  let intPart = amt / 10n ** BigInt(dec);
  let decimalPart = amt % 10n ** BigInt(dec);
  if (round && round < dec) {
    const factor = 10 ** (dec - round);
    decimalPart = BigInt(Math.round(Number(decimalPart) / factor) * factor);
    if (decimalPart === 10n ** BigInt(dec)) {
      intPart += 1n;
      decimalPart = 0n;
    }
  }
  const stringIntPart = plain ? intPart.toString() : intPart.toLocaleString();
  const paddedDecimalPart = decimalPart
    .toString()
    .padStart(dec, "0")
    .replace(/0+$/, "");
  if (!decimalPart) return stringIntPart;
  else {
    const n = 1.1;
    const decimalSeparator = n.toLocaleString().substring(1, 2);
    return stringIntPart + decimalSeparator + paddedDecimalPart;
  }
}

export async function nfdReverseLookup(addrs: string[]) {
  const { activeNetwork } = useNetwork();
  const network = networks.find((n) => n.networkId === activeNetwork.value);
  if (!network?.nfdUrl) return {};
  // break nfd lookup into groups of 20
  const groups = addrs.reduce((all: any, one: any, i: number) => {
    const ch = Math.floor(i / 20);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
  }, []);
  let nfds: any;
  await Promise.all(
    groups.map(async (g: string[]) => {
      await axios(
        `${network.nfdUrl}/nfd/lookup?view=thumbnail&` +
          new URLSearchParams(g.map((addr) => ["address", addr])).toString()
      )
        .then((resp: any) => {
          nfds = nfds ? { ...nfds, ...resp.data } : resp.data;
        })
        .catch(() => {});
    })
  );
  return nfds || {};
}
