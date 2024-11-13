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
import { Arc59Client } from "@/clients/Arc59Client";
import Algo, { getParams } from "@/services/Algo";
import { execAtc, getAssetInfo, resolveProtocol } from "@/utils";
import { populateAppCallResources } from "@algorandfoundation/algokit-utils";
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
  const sender = { addr: store.account.address, signer: transactionSigner };
  return new Arc59Client(
    { sender, resolveBy: "id", id: store.network.inboxRouter },
    Algo.algod
  );
}

async function claim() {
  try {
    if (!store.account) throw Error("Invalid Account");
    store.overlay = true;
    const appClient = getAppClient();
    const composer = appClient.compose();
    const claimerOptedIn = store.account?.assets?.some(
      (a) => a.assetId === asset.assetId
    );
    let totalTxns = 3;
    if (props.inboxInfo.minBalance < props.inboxInfo.amount) {
      totalTxns += 2;
      composer.arc59ClaimAlgo({}, { sendParams: { fee: (0).microAlgos() } });
    }
    // If the claimer hasn't already opted in, add a transaction to do so
    if (!claimerOptedIn) {
      const suggestedParams = await getParams();
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: store.account.address,
        to: store.account.address,
        amount: 0,
        assetIndex: Number(asset.assetId),
        suggestedParams,
      });
      composer.addTransaction({ txn, signer: transactionSigner });
    }
    const fee = (algosdk.ALGORAND_MIN_TX_FEE * totalTxns).microAlgos();
    composer.arc59Claim({ asa: asset.assetId }, { sendParams: { fee } });
    const atc = await populateAppCallResources(
      await composer.atc(),
      Algo.algod
    );
    await execAtc(atc, "Successfully Claimed Asset");
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
    const fee = (algosdk.ALGORAND_MIN_TX_FEE * 3).microAlgos();
    const composer = appClient.compose();
    composer.arc59Reject({ asa: asset.assetId }, { sendParams: { fee } });
    const atc = await populateAppCallResources(
      await composer.atc(),
      Algo.algod
    );
    await execAtc(atc, "Successfully Rejected Asset");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}
</script>
