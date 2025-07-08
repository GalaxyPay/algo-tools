<template>
  <v-card class="fill-height" color="#2B2B2B">
    <v-container>
      <v-row>
        <v-col cols="2" align-self="center" class="pr-0 pl-2">
          <v-img contain max-width="60" :src="image" />
        </v-col>
        <v-col cols="10" class="py-1">
          <v-container>
            <v-row>
              {{ assetInfo?.params?.name || asset.assetId }}
              <v-icon
                v-if="asset.assetId"
                :icon="mdiInformationOutline"
                color="grey"
                class="pl-2"
                @click="exploreAsset()"
              />
              <v-spacer />
              <span class="mr-2">
                <v-icon
                  :icon="mdiCheck"
                  color="success"
                  size="small"
                  @click="claim()"
                />
                <v-tooltip activator="parent" text="Claim" location="top" />
              </span>
              <span>
                <v-icon
                  :icon="mdiClose"
                  color="error"
                  size="small"
                  @click="reject()"
                />
                <v-tooltip activator="parent" text="Reject" location="top" />
              </span>
            </v-row>
            <v-row class="text-caption">
              {{ formatAmount() }}
              {{ assetInfo?.params.unitName }}
            </v-row>
          </v-container>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts" setup>
import { Arc59Factory } from "@/clients/Arc59Client";
import Algo, { getParams } from "@/services/Algo";
import { getAssetInfo, resolveProtocol } from "@/utils";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { mdiCheck, mdiClose, mdiInformationOutline } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";

const store = useAppStore();
const { transactionSigner } = useWallet();
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
  assetInfo.value = await getAssetInfo(asset.assetId, true);
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
  const algorand = AlgorandClient.fromClients({ algod: Algo.algod });
  algorand.setDefaultSigner(transactionSigner);
  algorand.setDefaultValidityWindow(1000);
  const factory = new Arc59Factory({
    defaultSender: store.account.address,
    algorand,
  });
  return factory.getAppClientById({ appId: BigInt(store.network.inboxRouter) });
}

async function claim() {
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
    const suggestedParams = await getParams();
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
    await composer.send({ populateAppCallResources: true });
    store.refresh++;
    store.setSnackbar("Successfully Claimed Asset", "success");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}

async function reject() {
  try {
    store.overlay = true;
    const appClient = getAppClient();
    const suggestedParams = await getParams();
    const fee = (Number(suggestedParams.minFee) * 3).microAlgos();
    await appClient
      .newGroup()
      .arc59Reject({ args: { asa: asset.assetId }, staticFee: fee })
      .send({ populateAppCallResources: true });
    store.refresh++;
    store.setSnackbar("Successfully Rejected Asset", "success");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}
</script>
