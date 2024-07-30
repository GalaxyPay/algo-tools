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
              <v-icon
                :icon="mdiDelete"
                color="error"
                size="x-small"
                @click="created ? destroy() : setReceiver()"
              />
            </v-row>
            <v-row class="text-caption">
              {{ formatAmount() }}
              {{ assetInfo?.params.unitName }}
            </v-row>
            <v-row class="text-caption">
              MBR:
              <AlgoIcon color="currentColor" :width="10" class="mx-1" />
              0.1
            </v-row>
          </v-container>
        </v-col>
      </v-row>
    </v-container>
    <!-- receiver dialog -->
    <v-dialog v-model="showReceiver" max-width="600">
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
    </v-dialog>
  </v-card>
</template>

<script lang="ts" setup>
import { getParams } from "@/services/Algo";
import { execAtc, getAssetInfo, resolveProtocol } from "@/utils";
import { mdiClose, mdiDelete, mdiInformationOutline } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";

const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();
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
const required = (v: string) => !!v || "Required";
const validAddress = (v: string) =>
  algosdk.isValidAddress(v) || "Invalid Address";
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
  assetInfo.value = await getAssetInfo(props.asset.assetId, true);
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
    receiver.value = assetInfo.value?.params.creator;
    closeOut();
  } else {
    showReceiver.value = true;
  }
}

async function destroy() {
  try {
    store.overlay = true;
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await getParams();
    const txn = algosdk.makeAssetDestroyTxnWithSuggestedParamsFromObject({
      from: activeAccount.value!.address,
      suggestedParams,
      assetIndex: Number(props.asset.assetId),
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, "Successfuly Destroyed Asset");
  } catch (err: any) {
    console.error(err);
    let message = err.message;
    const manager = "this transaction should be issued by the manager";
    if (message.includes(manager)) message = manager;
    if (message.includes("creator is holding only"))
      message = "Must hold 100% of asset.";
    store.setSnackbar(message, "error");
  }
  store.overlay = false;
}

async function closeOut() {
  if (props.asset.amount || !props.asset.assetId) {
    const { valid } = await form.value.validate();
    if (!valid) return;
  }
  try {
    store.overlay = true;
    const atc = new algosdk.AtomicTransactionComposer();
    showReceiver.value = false;
    const suggestedParams = await getParams();
    let txn;
    if (props.asset.assetId) {
      txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: activeAccount.value!.address,
        to: activeAccount.value!.address,
        closeRemainderTo: receiver.value,
        amount: 0,
        assetIndex: Number(props.asset.assetId),
        suggestedParams,
      });
    } else {
      txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAccount.value!.address,
        to: activeAccount.value!.address,
        closeRemainderTo: receiver.value,
        amount: 0,
        suggestedParams,
      });
    }
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, "Successfuly Closed Out of Asset");
  } catch (err: any) {
    console.error(err);
    let message = err.message;
    if (err.status == 400)
      message = "Must close/destroy all Assets and Apps first.";
    store.setSnackbar(message, "error");
  }
  store.overlay = false;
}
</script>
