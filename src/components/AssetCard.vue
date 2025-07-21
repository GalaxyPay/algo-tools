<script lang="ts" setup>
import { execAtc, getAssetInfo, resolveProtocol } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";
import { Delete, Info, X } from "lucide-vue-next";
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
    await execAtc(atc, algodClient.value, "Asset Destroyed");
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
    await execAtc(atc, algodClient.value, "Asset Closed Out");
  } catch (err: any) {
    console.error(err);
    let message = err.message;
    if (err.status == 400)
      message = "Must close/destroy all Assets and Apps first.";
    toast.error(message, { duration: 7000 });
  }
}

function handleClose() {
  showReceiver.value = false;
  creator.value = false;
  receiver.value = undefined;
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
        <div class="text-xs text-muted-foreground">
          {{ formatAmount() }}
          {{ assetInfo?.params.unitName }}
        </div>
        <div class="flex gap-1 items-center text-xs text-muted-foreground">
          MBR: <AlgoSymbol color="currentColor" :width="10" /> 0.1
        </div>
      </div>
    </div>
  </Card>
  <Dialog :open="showReceiver">
    <DialogContent class="!max-w-[530px] [&>button]:hidden">
      <div
        class="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
        @click="handleClose()"
      >
        <X :size="18" />
      </div>
      <DialogHeader>
        <DialogTitle>Choose Receiver</DialogTitle>
        <DialogDescription>
          Where should the remainder of the asset go?
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-4">
        <Input
          v-model="receiver"
          :disabled="creator"
          placeholder="Address"
          class="font-mono"
        />
        <div v-show="asset.assetId" class="flex items-center space-x-2">
          <Checkbox
            id="creator"
            class="border-gray-500"
            v-model="creator"
            label="Send back to creator"
          />
          <Label for="creator">Send back to creator</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="closeOut()">Submit</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
