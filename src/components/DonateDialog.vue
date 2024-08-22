<template>
  <v-dialog v-model="store.showDonate" max-width="400">
    <v-card>
      <v-card-title class="d-flex">
        Donate to AlgoTools <v-spacer />
        <v-icon
          color="currentColor"
          :icon="mdiClose"
          @click="store.showDonate = false"
        />
      </v-card-title>
      <v-card-text>How much would you like to give?</v-card-text>
      <v-form ref="form" @submit.prevent="donate()">
        <v-container>
          <v-text-field
            v-model.number="amount"
            type="number"
            label="Amount"
            :rules="[required]"
          />
          <v-textarea v-model="note" rows="2" label="Note" />
        </v-container>
        <v-card-actions>
          <v-spacer />
          <v-btn text="Send" type="submit" />
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { getParams } from "@/services/Algo";
import { execAtc } from "@/utils";
import { mdiClose } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";

const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();
const required = (v: any) => !!v || "Required";
const amount = ref();
const note = ref();
const form = ref();
async function donate() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  try {
    store.overlay = true;
    const atc = new algosdk.AtomicTransactionComposer();
    const enc = new TextEncoder();
    const suggestedParams = await getParams();
    const note64 = note.value ? enc.encode(note.value) : undefined;
    const microAlgo = amount.value * 10 ** 6;
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      receiver: "TOOLSGOIPA6BC2JHR4QZYWNYJQRKLTA7NQ44EDRUQCR2R26Y4Y5OAIE6MM",
      sender: activeAccount.value!.address,
      note: note64,
      suggestedParams,
      amount: microAlgo,
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, "Thank you for your donation!");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
  store.showDonate = false;
}

watch(
  () => store.showDonate,
  (val) => {
    if (!val) form.value.reset();
  }
);
</script>
