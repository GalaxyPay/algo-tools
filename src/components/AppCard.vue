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
                :icon="mdiInformationOutline"
                color="grey"
                class="pl-2"
                @click="exploreApp()"
              />
              <v-spacer />
              <template v-if="isOwned(app)">
                <span>
                  <v-icon
                    :icon="mdiDelete"
                    color="error"
                    size="small"
                    @click="deleteApp()"
                  />
                  <v-tooltip activator="parent" location="top" text="Delete" />
                </span>
              </template>
              <template v-else>
                <span>
                  <v-icon
                    :icon="mdiClose"
                    color="error"
                    size="small"
                    class="mr-2"
                    @click="closeOut()"
                  />
                  <v-tooltip
                    activator="parent"
                    location="top"
                    text="Close Out"
                  />
                </span>
                <span>
                  <v-icon
                    :icon="mdiCancel"
                    color="error"
                    size="small"
                    @click="clearState()"
                  />
                  <v-tooltip
                    activator="parent"
                    location="top"
                    text="Clear State"
                  />
                </span>
              </template>
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
  </v-card>
</template>

<script lang="ts" setup>
import { getParams } from "@/services/Algo";
import { execAtc, fetchAsync } from "@/utils";
import { mdiCancel, mdiClose, mdiDelete, mdiInformationOutline } from "@mdi/js";
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

function isOwned(app: any) {
  return app instanceof modelsv2.Application;
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
      store.overlay = true;
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await getParams();
      const txn = algosdk.makeApplicationCloseOutTxnFromObject({
        from: activeAccount.value!.address,
        suggestedParams,
        appIndex: Number(props.app.id),
      });
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, "Successfully Closed Out of Application");
    } catch (err: any) {
      console.error(err);
      store.setSnackbar(err.message, "error");
    }
    store.overlay = false;
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
      store.overlay = true;
      const atc = new algosdk.AtomicTransactionComposer();
      const suggestedParams = await getParams();
      const txn = algosdk.makeApplicationClearStateTxnFromObject({
        from: activeAccount.value!.address,
        suggestedParams,
        appIndex: Number(props.app.id),
      });
      atc.addTransaction({ txn, signer: transactionSigner });
      await execAtc(atc, "Successfully Cleared Application State");
    } catch (err: any) {
      console.error(err);
      store.setSnackbar(err.message, "error");
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
      await execAtc(atc, "Successfully Deleted Application");
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
