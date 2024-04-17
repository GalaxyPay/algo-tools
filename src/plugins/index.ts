/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Plugins
import vuetify from "./vuetify";
import pinia from "../stores";
import router from "../router";
import {
  NetworkId,
  WalletId,
  WalletManagerPlugin,
} from "@txnlab/use-wallet-vue";
import { nids } from "@/data";

// Types
import type { App } from "vue";
import { get } from "idb-keyval";

export async function registerPlugins(app: App) {
  const network = await get("network");
  const nid = (
    network
      ? nids.includes(network.networkId)
        ? network.networkId
        : "localnet"
      : "mainnet"
  ) as NetworkId;

  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(WalletManagerPlugin, {
      wallets: [
        {
          id: WalletId.LUTE,
          options: { siteName: "AlgoTools" },
        },
        WalletId.DEFLY,
        WalletId.PERA,
      ],
      network: nid,
    });
}
