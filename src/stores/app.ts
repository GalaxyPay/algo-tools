// Utilities
import { networks } from "@/data";
import type { Network, TinyAsset } from "@/types";
import { modelsv2 } from "algosdk";
import { get } from "idb-keyval";
import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    loading: 0,
    overlay: false,
    assetsLoading: 0,
    account: undefined as undefined | modelsv2.Account,
    refresh: 0,
    network: networks[0] as Network,
    showDonate: false,
    tinyman: undefined as undefined | TinyAsset[],
    nfds: {} as { [key: string]: any },
  }),
  getters: {},
  actions: {
    async getCache() {
      this.network = (await get("network")) || this.network;
    },
  },
});
