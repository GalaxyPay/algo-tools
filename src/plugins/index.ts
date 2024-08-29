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

// Types
import type { App } from "vue";

export function registerPlugins(app: App) {
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
      network: NetworkId.MAINNET,
    });
}
