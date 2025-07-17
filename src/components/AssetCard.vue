<script lang="ts" setup>
import { execAtc, getAssetInfo, resolveProtocol } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";
import { Delete, Info } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();
const props = defineProps({
  asset: {
    type: Object as PropType<
      modelsv2.AssetHolding | { assetId: number; amount: number }
    >,
    required: true,
  },
});

const assetInfo = ref<modelsv2.Asset>();
const image = ref();
const form = ref();
// const required = (v: string) => !!v || "Required";
// const validAddress = (v: string) =>
//   algosdk.isValidAddress(v) || "Invalid Address";
const showReceiver = ref(false);
const receiver = ref();
const creator = ref(false);

watch(
  creator,
  (val) => (receiver.value = val ? assetInfo.value?.params.creator : undefined)
);

const created = computed(() =>
  store.account?.createdAssets?.some((x) => x.index == props.asset.assetId)
);

onMounted(async () => {
  assetInfo.value = await getAssetInfo(
    props.asset.assetId,
    algodClient.value,
    true
  );
  if (assetInfo.value?.params.url) {
    image.value = await resolveProtocol(
      assetInfo.value.params.url,
      assetInfo.value.params.reserve || ""
    );
  }
});

function exploreAsset() {
  const url = store.network.explorer + "/asset/" + props.asset.assetId;
  window.open(url, "_blank");
}

function formatAmount() {
  return assetInfo.value
    ? (
        Number(props.asset.amount) /
        10 ** Number(assetInfo.value.params?.decimals)
      ).toLocaleString(undefined, {
        maximumFractionDigits: Number(assetInfo.value.params?.decimals),
      })
    : "-";
}

async function setReceiver() {
  if (!props.asset.amount && props.asset.assetId) {
    receiver.value = activeAddress.value!;
    closeOut();
  } else {
    showReceiver.value = true;
  }
}

async function destroy() {
  try {
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    const txn = algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
      sender: activeAddress.value!,
      suggestedParams,
      assetIndex: Number(props.asset.assetId),
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, algodClient.value, "Successfully Destroyed Asset");
  } catch (err: any) {
    console.error(err);
    let message = err.message;
    const manager = "this transaction should be issued by the manager";
    if (message.includes(manager)) message = manager;
    if (message.includes("creator is holding only"))
      message = "Must hold 100% of asset.";
    toast.error(message, { duration: 7000 });
  }
}

async function closeOut() {
  if (props.asset.amount || !props.asset.assetId) {
    const { valid } = await form.value.validate();
    if (!valid) return;
  }
  try {
    const atc = new algosdk.AtomicTransactionComposer();
    showReceiver.value = false;
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    let txn;
    if (props.asset.assetId) {
      txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress.value!,
        receiver: activeAddress.value!,
        closeRemainderTo: receiver.value,
        amount: 0,
        assetIndex: Number(props.asset.assetId),
        suggestedParams,
      });
    } else {
      txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAddress.value!,
        receiver: activeAddress.value!,
        closeRemainderTo: receiver.value,
        amount: 0,
        suggestedParams,
      });
    }
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, algodClient.value, "Successfully Closed Out of Asset");
  } catch (err: any) {
    console.error(err);
    let message = err.message;
    if (err.status == 400)
      message = "Must close/destroy all Assets and Apps first.";
    toast.error(message, { duration: 7000 });
  }
}
</script>

<template>
  <Card class="flex flex-1 px-4 py-2 bg-muted/50">
    <div class="flex flex-1 gap-2 items-center">
      <img class="max-w-[60px] max-h-[60px]" :src="image" />
      <div class="flex flex-1 flex-col">
        <div class="flex flex-1 gap-1 items-center font-bold">
          {{ assetInfo?.params?.name || asset.assetId }}
          <Info :size="18" @click="exploreAsset()" />
          <Delete
            :size="20"
            class="text-red-400 ml-auto"
            @click="created ? destroy() : setReceiver()"
          />
        </div>
        <div class="text-xs">
          {{ formatAmount() }}
          {{ assetInfo?.params.unitName }}
        </div>
        <div class="flex gap-1 items-center text-xs">
          MBR: <AlgoSymbol color="currentColor" :width="10" /> 0.1
        </div>
      </div>
    </div>
  </Card>
  <!-- TODO -->
  <!-- <v-dialog v-model="showReceiver" max-width="600">
      <v-card>
        <v-card-title class="d-flex">
          Choose Receiver
          <v-spacer />
          <v-icon
            color="currentColor"
            :icon="mdiClose"
            @click="showReceiver = false"
          />
        </v-card-title>
        <v-card-text> Where should the remainder of the asset go? </v-card-text>
        <v-form ref="form" @submit.prevent="closeOut()">
          <v-container>
            <v-text-field
              v-model="receiver"
              :disabled="creator"
              label="Address"
              :rules="[required, validAddress]"
              style="font-family: monospace"
            />
            <v-checkbox
              v-show="asset.assetId"
              v-model="creator"
              label="Send back to creator"
              hide-details
            />
          </v-container>
          <v-card-actions>
            <v-spacer />
            <v-btn text="Submit" type="submit" />
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog> -->
</template>
