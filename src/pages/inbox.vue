<script lang="ts" setup>
import { Arc59Factory } from "@/clients/Arc59Client";
import Algo from "@/services/Algo";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { mdiContentSave } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";
import { set } from "idb-keyval";

const store = useAppStore();
const { activeAddress, transactionSigner } = useWallet();
const inboxInfo = ref<modelsv2.Account>();

async function getInbox() {
  if (!activeAddress.value) return;
  if (!store.network.inboxRouter) return;
  let inbox: string;
  inboxInfo.value = undefined;
  try {
    const boxName = algosdk.decodeAddress(activeAddress.value).publicKey;
    const resp = await Algo.algod
      .getApplicationBoxByName(store.network.inboxRouter, boxName)
      .do();
    inbox = algosdk.encodeAddress(resp.value);
  } catch {
    return;
  }
  inboxInfo.value = await Algo.algod.accountInformation(inbox).do();
}

async function createRouter() {
  try {
    store.overlay = true;
    if (!store.account) throw Error("Invalid Account");
    const algorand = AlgorandClient.fromClients({ algod: Algo.algod });
    algorand.setDefaultSigner(transactionSigner);
    algorand.setDefaultValidityWindow(1000);
    const factory = new Arc59Factory({
      defaultSender: store.account.address,
      algorand,
    });
    const { result } = await factory.send.create.createApplication();
    store.network.inboxRouter = Number(result.appId);
    setRouter();
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}

async function setRouter() {
  await set("network", JSON.parse(JSON.stringify(store.network)));
  store.refresh++;
  store.setSnackbar("Router ID Set", "success", 2000);
}

watch(
  () => store.refresh,
  () => {
    getInbox();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-4 p-4 pt-0">
    <Card class="bg-muted/50">
      <CardHeader>
        <CardTitle> Asset Inbox </CardTitle>
        <CardDescription>
          View and claim assets sent to your inbox
        </CardDescription>
      </CardHeader>
      <CardContent>
        <v-col
          v-if="!inboxInfo?.assets?.length"
          class="text-center font-italic py-12"
        >
          Your Inbox is Empty
        </v-col>
        <v-col
          v-for="n in inboxInfo?.assets?.length"
          :key="n"
          cols="12"
          md="6"
          lg="4"
        >
          <InboxAsset :inbox-info="inboxInfo!" :idx="n - 1" />
        </v-col>
      </CardContent>
    </Card>
    <Card v-if="store.network.name === 'LocalNet'">
      <CardHeader>
        <CardTitle> LocalNet Router Config </CardTitle>
      </CardHeader>
      <CardContent>
        <v-col>
          <v-btn text="Create New" @click="createRouter()" />
        </v-col>
        <v-col> OR </v-col>
        <v-col>
          <v-text-field
            v-model.number="store.network.inboxRouter"
            label="Existing App ID"
            hide-details
            :append-inner-icon="mdiContentSave"
            @click:append-inner="setRouter()"
            @keyup.enter="setRouter()"
          />
        </v-col>
      </CardContent>
    </Card>
  </div>
</template>
