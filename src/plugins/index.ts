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
  NetworkConfigBuilder,
  NetworkId,
  WalletId,
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
  })
  .build();

export function registerPlugins(app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
    .use(WalletManagerPlugin, {
      wallets: [WalletId.LUTE, WalletId.DEFLY, WalletId.PERA, WalletId.KIBISIS],
      defaultNetwork: NetworkId.MAINNET,
      networks,
    });
}
