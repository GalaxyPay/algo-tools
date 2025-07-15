// Utilities
import type { TinyAsset } from "@/types";
import { modelsv2 } from "algosdk";
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
  getters: {},
  actions: {},
});
