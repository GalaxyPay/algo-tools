<script lang="ts" setup>
import { Arc59Factory } from "@/clients/Arc59Client";
import { getAssetInfo, resolveProtocol } from "@/utils";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";
import { Check, Info, X } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, transactionSigner } = useWallet();
const props = defineProps({
  inboxInfo: {
    type: Object as PropType<modelsv2.Account>,
    required: true,
  },
  idx: { type: Number, required: true },
});

// eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
const asset = props.inboxInfo.assets?.[props.idx]!;
const assetInfo = ref<modelsv2.Asset>();
const image = ref();

onMounted(async () => {
  assetInfo.value = await getAssetInfo(asset.assetId, algodClient.value, true);
  if (assetInfo.value?.params.url) {
    image.value = await resolveProtocol(
      assetInfo.value.params.url,
      assetInfo.value.params.reserve || ""
    );
  }
});

function exploreAsset() {
  const url = store.network.explorer + "/asset/" + asset.assetId;
  window.open(url, "_blank");
}

function formatAmount() {
  return assetInfo.value
    ? (
        Number(asset.amount) /
        10 ** Number(assetInfo.value.params?.decimals)
      ).toLocaleString(undefined, {
        maximumFractionDigits: Number(assetInfo.value.params?.decimals),
      })
    : "-";
}

function getAppClient() {
  if (!store.account?.address) throw Error("Invalid Claimer");
  if (!store.network.inboxRouter) throw Error("Invalid Router");
  const algorand = AlgorandClient.fromClients({ algod: algodClient.value });
  algorand.setDefaultSigner(transactionSigner);
  algorand.setDefaultValidityWindow(1000);
  const factory = new Arc59Factory({
    defaultSender: store.account.address,
    algorand,
  });
  return factory.getAppClientById({ appId: BigInt(store.network.inboxRouter) });
}

async function claim() {
  let toastId: number | string | undefined = undefined;
  try {
    if (!store.account) throw Error("Invalid Account");
    store.overlay = true;
    const appClient = getAppClient();
    const composer = appClient.newGroup();
    const claimerOptedIn = store.account?.assets?.some(
      (a) => a.assetId === asset.assetId
    );
    let totalTxns = 3;
    if (props.inboxInfo.minBalance < props.inboxInfo.amount) {
      totalTxns += 2;
      composer.arc59ClaimAlgo({ args: {}, staticFee: (0).algo() });
    }
    // If the claimer hasn't already opted in, add a transaction to do so
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    if (!claimerOptedIn) {
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: store.account.address,
        receiver: store.account.address,
        amount: 0,
        assetIndex: Number(asset.assetId),
        suggestedParams,
      });
      composer.addTransaction(txn, transactionSigner);
    }
    const fee = (Number(suggestedParams.minFee) * totalTxns).microAlgos();
    composer.arc59Claim({ args: { asa: asset.assetId }, staticFee: fee });
    toastId = toast.info("Processing...", {
      duration: Infinity,
    });
    await composer.send({ populateAppCallResources: true });
    store.refresh++;
    toast.dismiss(toastId);
    toast.success("Asset Claimed");
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
  toast.dismiss(toastId);
  store.overlay = false;
}

async function reject() {
  let toastId: number | string | undefined = undefined;
  try {
    store.overlay = true;
    const appClient = getAppClient();
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    const fee = (Number(suggestedParams.minFee) * 3).microAlgos();
    toastId = toast.info("Processing...", {
      duration: Infinity,
    });
    await appClient
      .newGroup()
      .arc59Reject({ args: { asa: asset.assetId }, staticFee: fee })
      .send({ populateAppCallResources: true });
    store.refresh++;
    toast.dismiss(toastId);
    toast.success("Asset Rejected");
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
  toast.dismiss(toastId);
  store.overlay = false;
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
          <div class="flex gap-2 ml-auto">
            <Tooltip>
              <TooltipTrigger as-child>
                <Check :size="20" @click="claim()" class="text-vuet" />
              </TooltipTrigger>
              <TooltipContent>Claim</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <X :size="20" @click="reject()" class="text-red-400" />
              </TooltipTrigger>
              <TooltipContent>Reject</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div class="text-xs text-muted-foreground">
          {{ formatAmount() }}
          {{ assetInfo?.params.unitName }}
        </div>
      </div>
    </div>
  </Card>
</template>
