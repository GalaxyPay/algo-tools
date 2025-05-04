<template>
  <v-navigation-drawer v-model="drawer" app :order="1">
    <v-list dense nav>
      <v-list-item to="/" title="Home" :prepend-icon="mdiHome" exact />
      <v-list-item
        v-for="tool in tools()"
        :key="tool.title"
        :to="tool.path"
        :title="tool.title"
        :prepend-icon="tool.icon"
      />
      <v-list-item title="Donate" @click="store.showDonate = true">
        <template #prepend>
          <v-icon>
            <algo-icon color="currentColor" class="ma-1" />
          </v-icon>
        </template>
      </v-list-item>
    </v-list>
    <v-container v-show="!smAndUp" class="text-center pr-6">
      <v-select
        v-model="network"
        class="pl-3 mt-6"
        :items="networkList"
        density="compact"
        variant="outlined"
        :append-icon="network == 'Custom' ? mdiPencil : ''"
        @click:append="showCustomNode = true"
      />
    </v-container>
  </v-navigation-drawer>
  <v-app-bar app :order="0">
    <v-app-bar-nav-icon
      v-show="activeAddress"
      color="currentColor"
      @click.stop="drawer = !drawer"
    />
    <span
      class="text-vuet text-h5 ml-3 pt-2 no-select"
      style="cursor: pointer"
      @click="router.push('/')"
    >
      <algo-icon color="currentColor" :width="30" />lgoTools
    </span>
    <div>
      <v-select
        v-show="smAndUp"
        v-model="network"
        class="pl-3 mt-6"
        :items="networkList"
        density="compact"
        variant="outlined"
        :append-icon="network === 'Custom' ? mdiPencil : ''"
        @click:append="showCustomNode = true"
      />
    </div>
    <v-spacer />
    <v-btn color="primary" variant="outlined" :disabled="!!store.loading">
      {{ formatAddr(activeAddress) || "Connect Wallet" }}
      <v-menu activator="parent" v-model="store.connectMenu" scrim>
        <v-list>
          <v-container>
            <v-row v-if="activeAddress">
              <v-col class="text-caption" style="font-family: monospace">
                {{ smAndUp ? activeAddress : formatAddr(activeAddress, 16) }}
              </v-col>
              <v-col class="pt-2 text-right">
                <v-icon
                  size="x-small"
                  :icon="mdiContentCopy"
                  @click.stop="copyToClipboard()"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col>Balance:</v-col>
              <v-col class="text-right">
                <algo-icon color="currentColor" :width="15" class="mr-1" />
                {{
                  store.account
                    ? (Number(store.account.amount) / 10 ** 6).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 6,
                        }
                      )
                    : "-"
                }}
              </v-col>
            </v-row>
          </v-container>
          <template v-for="wallet in wallets" :key="wallet.id">
            <v-divider />
            <v-list-item
              :prepend-avatar="wallet.metadata.icon"
              :height="wallet.isActive ? '70' : ''"
            >
              <div class="d-flex align-center">
                {{ wallet.metadata.name }}
                <v-select
                  v-if="wallet.isActive"
                  :items="items"
                  :model-value="{address: activeAddress!, title: formatAddr(activeAddress)}"
                  return-object
                  class="pl-2"
                  density="compact"
                  variant="solo-filled"
                  hide-details
                  @click.stop
                  @update:model-value="(a) => switchAccount(wallet, a.address)"
                />
              </div>
              <template #append>
                <v-btn
                  class="ml-3"
                  color="white no-uppercase"
                  size="small"
                  variant="tonal"
                  :icon="!smAndUp"
                  :min-width="smAndUp ? '140' : ''"
                  @click.stop="walletAction(wallet)"
                >
                  <v-icon
                    v-if="wallet.isActive"
                    :icon="mdiMinusCircleOutline"
                    color="error"
                  />
                  <v-icon
                    v-else-if="wallet.isConnected"
                    :icon="mdiLightningBoltOutline"
                    color="primary"
                  />
                  <v-icon v-else :icon="mdiPlusCircleOutline" color="vuet" />
                  <div v-if="smAndUp" class="ml-1">
                    {{
                      wallet.isActive
                        ? "Disconnect"
                        : wallet.isConnected
                        ? "Make Active"
                        : "Connect"
                    }}
                  </div>
                </v-btn>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </v-menu>
    </v-btn>
  </v-app-bar>
  <custom-node :visible="showCustomNode" @close="showCustomNode = false" />
</template>

<script lang="ts" setup>
import { networks, nids, tools } from "@/data";
import { getNetwork } from "@/services/Algo";
import type { Network } from "@/types";
import { formatAddr } from "@/utils";
import {
  mdiContentCopy,
  mdiHome,
  mdiLightningBoltOutline,
  mdiMinusCircleOutline,
  mdiPencil,
  mdiPlusCircleOutline,
} from "@mdi/js";
import {
  NetworkId,
  type Wallet,
  useNetwork,
  useWallet,
} from "@txnlab/use-wallet-vue";
import { set } from "idb-keyval";
import { useDisplay } from "vuetify";

const store = useAppStore();
const { smAndUp } = useDisplay();
const router = useRouter();
const drawer = ref(false);
const showCustomNode = ref(false);
const { activeAddress, activeWallet, wallets } = useWallet();
const { setActiveNetwork } = useNetwork();

const networkList = networks.map((n) => n.name);
networkList.push("Custom");

const network = computed({
  get() {
    return store.network.name;
  },
  async set(val) {
    if (val == "Custom") {
      showCustomNode.value = true;
    } else {
      const network = { ...networks.find((x) => x.name == val) } as Network;
      if (!network) throw Error("Invalid Network");
      if (val == "LocalNet") {
        network.networkId = await getNetwork(
          network.algod.token,
          network.algod.url,
          network.algod.port
        );
      }
      await set("network", network);
      await store.getCache();
      const nid = (
        nids.includes(network.networkId) ? network.networkId : "localnet"
      ) as NetworkId;
      setActiveNetwork(nid);
      store.refresh++;
    }
  },
});

async function walletAction(wallet: Wallet) {
  try {
    if (wallet.isActive) await wallet.disconnect();
    else if (wallet.isConnected) wallet.setActive();
    else await wallet.connect();
    store.refresh++;
    store.connectMenu = false;
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
}

const items = computed(() => {
  const val = activeWallet.value?.accounts.map((a) => ({
    address: a.address,
    title: formatAddr(a.address),
  }));
  return val;
});

async function switchAccount(wallet: Wallet, addr: string) {
  wallet.setActiveAccount(addr);
  store.refresh++;
  store.connectMenu = false;
}

function copyToClipboard() {
  if (!activeAddress.value) return;
  navigator.clipboard.writeText(activeAddress.value);
  store.setSnackbar("Address Copied", "info", 1000);
}
</script>
