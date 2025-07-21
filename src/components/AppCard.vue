<script lang="ts" setup>
import { execAtc, fetchAsync } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";
import { CircleOff, Delete, Info, X } from "lucide-vue-next";
import { toast } from "vue-sonner";

const props = defineProps({
  app: {
    type: Object as PropType<
      modelsv2.ApplicationLocalState | modelsv2.Application
    >,
    required: true,
  },
});
const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();

const appInfo = ref();

onMounted(async () => {
  appInfo.value = (
    await fetchAsync(
      `https://algoaccinfo.com:8443/applications/?id=${props.app.id}`
    )
  )[0];
});

function exploreApp() {
  const url = store.network.explorer + "/application/" + props.app.id;
  window.open(url, "_blank");
}

function isOwned() {
  return props.app instanceof modelsv2.Application;
}

async function closeOut() {
  if (
    confirm(
      "WARNING: Closing-out of this contract may result in financial loss. " +
        "Before performing this action you should make sure this contract doesn't hold any current or future value. " +
        "Are you sure you want to proceed?"
    )
  ) {
    try {
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await algodClient.value
        .getTransactionParams()
        .do();
      const txn = algosdk.makeApplicationCloseOutTxnFromObject({
        sender: activeAddress.value!,
        suggestedParams,
        appIndex: Number(props.app.id),
      });
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, algodClient.value, "Application Closed Out");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { duration: 7000 });
    }
  }
}

async function clearState() {
  if (
    confirm(
      "WARNING: CLEAR-STATE SHOULD ONLY BE USED IF CLOSE-OUT FAILS. Clearing this contract's state may result in financial loss. " +
        "Before performing this action you should make sure this contract doesn't hold any current or future value. " +
        "Are you sure you want to proceed?"
    )
  ) {
    try {
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await algodClient.value
        .getTransactionParams()
        .do();
      const txn = algosdk.makeApplicationClearStateTxnFromObject({
        sender: activeAddress.value!,
        suggestedParams,
        appIndex: Number(props.app.id),
      });
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, algodClient.value, "Application State Cleared");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { duration: 7000 });
    }
  }
}

async function deleteApp() {
  if (
    confirm(
      "WARNING: This will permenantly DELETE the contract. Are you sure you want to proceed?"
    )
  ) {
    try {
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await algodClient.value
        .getTransactionParams()
        .do();
      const txn = algosdk.makeApplicationDeleteTxnFromObject({
        sender: activeAddress.value!,
        suggestedParams,
        appIndex: Number(props.app.id),
      });
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, algodClient.value, "Application Deleted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { duration: 7000 });
    }
  }
}

function mbr() {
  let cost;
  if (props.app instanceof modelsv2.ApplicationLocalState)
    cost =
      (100000 +
        28500 * Number(props.app.schema.numUint) +
        50000 * Number(props.app.schema.numByteSlice)) /
      10 ** 6;
  else
    cost =
      (100000 +
        28500 * Number(props.app.params.globalStateSchema?.numUint) +
        50000 * Number(props.app.params.globalStateSchema?.numByteSlice)) /
      10 ** 6;
  return cost;
}
</script>

<template>
  <Card class="flex flex-1 px-4 py-2 bg-muted/50">
    <div class="flex flex-1 gap-2 items-center">
      <img
        v-if="appInfo?.name"
        class="max-w-[60px] max-h-[60px]"
        :src="`https://algoaccinfo.com:8443/images/${appInfo.name.toLowerCase()}.png`"
      />
      <div class="flex flex-1 flex-col">
        <div class="flex flex-1 gap-1 items-center font-bold">
          {{ appInfo ? appInfo.name : app.id }}
          <Info :size="18" @click="exploreApp()" />
          <Tooltip v-if="isOwned()">
            <TooltipTrigger as-child>
              <Delete
                :size="20"
                class="text-red-400 ml-auto"
                @click="deleteApp()"
              />
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <div v-else class="flex gap-2 text-red-400 ml-auto">
            <Tooltip>
              <TooltipTrigger as-child>
                <X :size="20" @click="closeOut()" />
              </TooltipTrigger>
              <TooltipContent>Close Out</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <CircleOff :size="20" @click="clearState()" />
              </TooltipTrigger>
              <TooltipContent>Clear State</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {{ appInfo?.description }}
        <div class="flex gap-1 items-center text-xs text-muted-foreground">
          MBR: <AlgoSymbol color="currentColor" :width="10" /> {{ mbr() }}
        </div>
      </div>
    </div>
  </Card>
</template>
