// Utilities
import { networks } from "@/data";
import type { Network, SnackBar, TinyAsset } from "@/types";
import { modelsv2 } from "algosdk";
import { get } from "idb-keyval";
import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    loading: 0,
    overlay: false,
    assetsLoading: 0,
    account: undefined as undefined | modelsv2.Account,
    snackbar: {
      text: "",
      color: "",
      timeout: 0,
      display: false,
    } as SnackBar,
    refresh: 0,
    network: networks[0] as Network,
    showDonate: false,
    connectMenu: false,
    tinyman: undefined as undefined | TinyAsset[],
  }),
  getters: {},
  actions: {
    async getCache() {
      this.network = (await get("network")) || this.network;
    },
    async setSnackbar(text: string, color = "info", timeout = 4000) {
      if (color == "error") timeout = 15000;
      this.snackbar = {
        text: text,
        color: color,
        timeout: timeout,
        display: true,
      };
    },
  },
});
