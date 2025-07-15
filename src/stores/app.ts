// Utilities
// import { networks } from "@/data";
import type { TinyAsset } from "@/types";
// import { useNetwork } from "@txnlab/use-wallet-vue";
import { modelsv2 } from "algosdk";
// import { get } from "idb-keyval";
import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    loading: 0,
    overlay: false,
    assetsLoading: 0,
    account: undefined as undefined | modelsv2.Account,
    refresh: 0,
    tinyman: undefined as undefined | TinyAsset[],
    nfds: {} as { [key: string]: any },
  }),
  getters: {
    // network() {
    //   const { activeNetwork } = useNetwork();
    //   return networks.find((n) => n.networkId === activeNetwork.value);
    // },
  },
  actions: {},
});
