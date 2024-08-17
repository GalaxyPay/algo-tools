<template>
  <v-container>
    <v-row>
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
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import InboxAsset from "@/components/InboxAsset.vue";
import Algo from "@/services/Algo";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";

const store = useAppStore();
const { activeAccount } = useWallet();
const inboxInfo = ref<modelsv2.Account>();

async function getInbox() {
  if (!activeAccount.value?.address) return;
  let inbox: string;
  inboxInfo.value = undefined;
  try {
    const boxName = algosdk.decodeAddress(
      activeAccount.value.address
    ).publicKey;
    const resp = await Algo.algod
      .getApplicationBoxByName(store.network.inboxRouter, boxName)
      .do();
    inbox = algosdk.encodeAddress(resp.value);
  } catch {
    return;
  }
  const info = await Algo.algod.accountInformation(inbox).do();
  inboxInfo.value = modelsv2.Account.from_obj_for_encoding(info);
}

onMounted(async () => {
  await getInbox();
});

watch(
  () => store.refresh,
  () => {
    getInbox();
  }
);
</script>
