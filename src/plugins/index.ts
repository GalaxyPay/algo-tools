/**
 * plugins/index.ts
 *
 * Automatically included in `./src/main.ts`
 */

// Plugins
import pinia from "../stores";
import router from "../router";
import { lute } from "@galaxypay/use-wallet-lute";
import { defly } from "@txnlab/use-wallet-defly";
import { pera } from "@txnlab/use-wallet-pera";
import {
  NetworkConfigBuilder,
  WalletManagerPlugin,
} from "@txnlab/use-wallet-vue";

// Types
import type { App } from "vue";

const networks = new NetworkConfigBuilder()
  .addNetwork("voimain", {
    algod: {
      baseServer: "https://mainnet-api.voi.nodely.dev",
      token: "",
    },
    caipChainId: "voi:r20fSQI8gWe/kFZziNonSPCXLwcQmH/n",
  })
  .build();

export function registerPlugins(app: App) {
  app
    .use(router)
    .use(pinia)
    .use(WalletManagerPlugin, {
      wallets: [lute(), defly(), pera()],
      networks,
      defaultNetwork: "mainnet",
      options: { persistNetwork: true },
    });
}
