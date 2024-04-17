<template>
  <v-card class="fill-height" variant="tonal">
    <v-container>
      <v-row>
        <v-col cols="2" align-self="center" class="pr-0 pl-2">
          <v-img
            v-if="appInfo?.name"
            contain
            max-width="60"
            :src="`https://algoaccinfo.com:8443/images/${appInfo.name.toLowerCase()}.png`"
          />
        </v-col>
        <v-col cols="10" class="py-1">
          <v-container>
            <v-row>
              {{ appInfo ? appInfo.name : app.id }}
              <v-icon
                icon="mdi-information-outline"
                size="x-small"
                color="grey"
                class="pl-2"
                @click="exploreApp()"
              />
              <v-spacer />
              <v-icon
                icon="mdi-delete"
                color="error"
                size="x-small"
                @click="
                  app instanceof modelsv2.Application ? deleteApp() : closeOut()
                "
              />
            </v-row>
            <v-row v-if="appInfo">
              {{ appInfo.description }}
            </v-row>
            <v-row class="text-caption">
              MBR:
              <algo-icon color="currentColor" :width="10" class="mx-1" />
              {{ mbr() }}
            </v-row>
          </v-container>
        </v-col>
      </v-row>
    </v-container>
    <!-- clear dialog -->
    <v-dialog v-model="showClear" max-width="400">
      <v-card title="Close Out Failed" text="Would you like to Clear State?">
        <v-card-actions>
          <v-spacer />
          <v-btn text="No" color="grey" @click="showClear = false" />
          <v-btn text="Yes" @click="closeOut(true)" />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script lang="ts" setup>
import { getParams } from "@/services/Algo";
import { execAtc, fetchAsync } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";

const props = defineProps({
  app: {
    type: Object as PropType<
      modelsv2.ApplicationLocalState | modelsv2.Application
    >,
    required: true,
  },
});
const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();
const showClear = ref(false);

const appInfo = ref();

onMounted(async () => {
  appInfo.value = (
    await fetchAsync(
      `https://algoaccinfo.com:8443/applications/?id=${props.app.id}`
    )
  )[0];
});

function exploreApp() {
  window.open(
    store.network.explorer + "/application/" + props.app.id,
    "_blank"
  );
}

async function closeOut(force: boolean = false) {
  if (
    confirm(
      "WARNING: Opting-out of this contract may result in financial loss. " +
        "Before opting-out you should make sure this contract doesn't hold any current or future value. " +
        "Are you sure you want to proceed?"
    )
  ) {
    try {
      store.overlay = true;
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await getParams();
      let txn;
      if (force) {
        txn = algosdk.makeApplicationClearStateTxnFromObject({
          from: activeAccount.value!.address,
          suggestedParams,
          appIndex: Number(props.app.id),
        });
      } else {
        txn = algosdk.makeApplicationCloseOutTxnFromObject({
          from: activeAccount.value!.address,
          suggestedParams,
          appIndex: Number(props.app.id),
        });
      }
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, "Successfuly Closed Out of Application");
      showClear.value = false;
    } catch (err: any) {
      console.error(err);
      store.setSnackbar(err.message, "error");
      if (err.status == 400) {
        showClear.value = true;
      }
    }
    store.overlay = false;
  }
}
async function deleteApp() {
  if (
    confirm(
      "WARNING: This will permenantly DELETE the contract. Are you sure you want to proceed?"
    )
  ) {
    try {
      store.overlay = true;
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await getParams();
      const txn = algosdk.makeApplicationDeleteTxnFromObject({
        from: activeAccount.value!.address,
        suggestedParams,
        appIndex: Number(props.app.id),
      });
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, "Successfuly Deleted Application");
    } catch (err: any) {
      console.error(err);
      store.setSnackbar(err.message, "error");
    }
    store.overlay = false;
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
