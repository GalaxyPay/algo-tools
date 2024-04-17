<template>
  <v-dialog v-model="showCustomNode" max-width="800" persistent>
    <v-card>
      <v-card-title>Custom Node</v-card-title>
      <v-form ref="form" @submit.prevent="setCustomNode">
        <v-container>
          <v-text-field
            v-model="algod.url"
            label="Algod URL"
            :rules="[required]"
          />
          <v-text-field v-model="algod.port" label="Algod Port" />
          <v-text-field v-model="algod.token" label="Algod Token" />
          <v-text-field
            v-model="network"
            label="Network (verify)"
            disabled
            :rules="[required]"
          />
        </v-container>
        <v-card-actions>
          <v-spacer />
          <v-btn text="Cancel" color="grey" @click="showCustomNode = false" />
          <v-btn text="Verify" @click="verify()" />
          <v-btn text="Save" type="submit" :disabled="!network" />
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { networks, nids } from "@/data";
import { getNetwork } from "@/services/Algo";
import { Network } from "@/types";
import { NetworkId, useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { set } from "idb-keyval";

const props = defineProps({
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const form = ref();
const required = (v: string) => !!v || "Required";

const showCustomNode = computed({
  get() {
    return props.visible;
  },
  set(value) {
    if (!value) {
      form.value.reset();
      emit("close");
    }
  },
});

watch(
  () => showCustomNode.value,
  () => {
    algod.value = {
      url: store.network.algod.url,
      port: store.network.algod.port,
      token: store.network.algod.token,
    };
  }
);

const store = useAppStore();
const { setActiveNetwork } = useWallet();
const algod = ref<{ token: string; url: string; port: string }>({
  token: "",
  url: "",
  port: "",
});
const network = ref();

async function verify() {
  try {
    network.value = await getNetwork(
      algod.value.token,
      algod.value.url,
      algod.value.port
    );
  } catch (err: any) {
    console.error(err);
    let message: string = err.message;
    if (message.includes("fetch") && algod.value.url.startsWith("http:")) {
      message = `Your node URL (${algod.value.url}) is not secure. This is normal, but in order to allow this connection you must configure your browser to allow Insecure Content for this site.`;
    }
    store.setSnackbar(message, "error");
  }
}

async function setCustomNode() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  const tempClient = new algosdk.Algodv2(
    algod.value.token,
    algod.value.url,
    algod.value.port
  );
  const genesis = await tempClient.genesis().do();
  const network = {
    ...networks.find(
      (x) => x.networkId === genesis.network || x.name === "Sandbox"
    ),
  } as Network;
  network.name = "Custom";
  network.algod = algod.value;
  network.networkId = genesis.network;
  await set("network", JSON.parse(JSON.stringify(network)));
  await store.getCache();
  const nid = (
    nids.includes(network.networkId) ? network.networkId : "localnet"
  ) as NetworkId;
  setActiveNetwork(nid);
  store.refresh++;
  showCustomNode.value = false;
}
</script>
