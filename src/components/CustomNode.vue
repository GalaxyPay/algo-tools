<template>
  <v-dialog v-model="showCustomNode" max-width="800" persistent>
    <v-card>
      <v-card-title>Custom Node</v-card-title>
      <v-form ref="form" @submit.prevent="setCustomNode">
        <v-container>
          <v-combobox
            v-model="algod.url"
            label="Algod URL"
            variant="outlined"
            density="comfortable"
            :rules="[required]"
            :items="customs"
            item-title="url"
            item-value="url"
            :return-object="false"
            @update:model-value="selectCustom"
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
import { Network, Node } from "@/types";
import { NetworkId, useWallet } from "@txnlab/use-wallet-vue";
import { get, set } from "idb-keyval";

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
  (val) => {
    if (val)
      algod.value = {
        url: store.network.algod.url,
        port: store.network.algod.port,
        token: store.network.algod.token,
      };
  }
);

const store = useAppStore();
const { setActiveNetwork } = useWallet();
const algod = ref<Node>({
  token: "",
  url: "",
  port: "",
});
const network = ref<string>();
const customs = ref<Node[]>([]);

function selectCustom(url: string) {
  const val = customs.value.find((x) => x.url === url);
  if (val) {
    algod.value.port = val.port;
    algod.value.token = val.token;
  }
}

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
  const custom = {
    ...networks.find(
      (x) => x.networkId === network.value || x.name === "Sandbox"
    ),
  } as Network;
  custom.name = "Custom";
  custom.algod = algod.value;
  custom.networkId = network.value!;
  await set("network", JSON.parse(JSON.stringify(custom)));

  const idx = customs.value.findIndex((a) => a.url === algod.value.url);
  if (idx === -1) {
    customs.value.push(JSON.parse(JSON.stringify(algod.value)));
  } else {
    customs.value.splice(idx, 1, JSON.parse(JSON.stringify(algod.value)));
  }
  await set("customs", JSON.parse(JSON.stringify(customs.value)));

  await store.getCache();
  const nid = (
    nids.includes(custom.networkId) ? custom.networkId : "localnet"
  ) as NetworkId;
  setActiveNetwork(nid);
  store.refresh++;
  showCustomNode.value = false;
}

onMounted(async () => {
  customs.value = JSON.parse(JSON.stringify((await get("customs")) || []));
});
</script>
