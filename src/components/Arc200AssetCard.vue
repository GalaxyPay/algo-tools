<template>
  <v-card class="fill-height" color="#2B2B2B" @click="showSend = true">
    <v-container>
      <v-row justify="end" class="pr-1">
        <span>
          <v-icon
            :icon="isHidden ? mdiCircleOutline : mdiCancel"
            size="x-small"
            @click.stop="emit('toggleHidden', asset.contractId)"
          />
          <v-tooltip
            activator="parent"
            location="top"
            :text="isHidden ? 'Unhide' : 'Hide'"
          />
        </span>
      </v-row>
      <div>{{ asset.params.name }} ({{ asset.contractId }})</div>
      <div class="text-caption">
        {{ asset.balance / 10 ** asset.params.decimals }}
        {{ asset.params.symbol }}
      </div>
    </v-container>
  </v-card>
  <!-- send dialog -->
  <v-dialog v-model="showSend" max-width="600">
    <v-card>
      <v-card-title class="d-flex">
        Send Asset
        <v-spacer />
        <v-icon
          color="currentColor"
          :icon="mdiClose"
          @click="showSend = false"
        />
      </v-card-title>
      <v-form ref="form" @submit.prevent="sendAsset()">
        <v-container>
          <v-text-field
            v-model.number="amount"
            type="number"
            label="Amount"
            :rules="[required]"
          >
            <template #append-inner>
              <v-btn
                text="Max"
                variant="text"
                color="grey"
                @click="maxAmount()"
              />
            </template>
          </v-text-field>
          <v-text-field
            v-model="receiver"
            :disabled="creator"
            label="Receiver Address"
            :rules="[required, validAddress]"
            style="font-family: monospace"
          />
          <v-checkbox
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
</template>

<script lang="ts" setup>
import Algo from "@/services/Algo";
import { execAtc } from "@/utils";
import { mdiCancel, mdiCircleOutline, mdiClose } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { arc200 as Contract } from "ulujs";

const props = defineProps({
  asset: { type: Object, required: true },
  isHidden: { type: Boolean, required: true },
});

const emit = defineEmits(["toggleHidden"]);

const store = useAppStore();
const form = ref();
const showSend = ref(false);
const amount = ref();
const receiver = ref();
const creator = ref(false);
const { activeAccount, transactionSigner } = useWallet();

watch(
  creator,
  (val) => (receiver.value = val ? props.asset.params.creator : undefined)
);

const required = (v: any) => !!v || v === 0 || "Required";
const validAddress = (v: string) =>
  algosdk.isValidAddress(v) || "Invalid Address";

function maxAmount() {
  amount.value = props.asset.balance / 10 ** props.asset.params.decimals;
}

async function sendAsset() {
  const { valid } = await form.value.validate();
  if (!valid) return;

  try {
    store.overlay = true;
    if (!activeAccount.value) throw Error("Invalid Account");
    const contract = new Contract(
      props.asset.contractId,
      Algo.algod,
      Algo.indexer,
      { acc: { addr: activeAccount.value.address, sk: new Uint8Array() } }
    );
    const sim = await contract.arc200_transfer(
      receiver.value,
      amount.value,
      true,
      true
    );
    if (sim.success) {
      const atc = new algosdk.AtomicTransactionComposer();
      sim.txns.forEach((txn) => {
        const dtxn = algosdk.decodeUnsignedTransaction(
          Buffer.from(txn, "base64")
        );
        delete dtxn.group;
        atc.addTransaction({
          txn: dtxn,
          signer: transactionSigner,
        });
      });
      await execAtc(atc, "Successfully Sent Asset");
    }
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}
watch(
  () => showSend.value,
  (val) => {
    if (!val) form.value.reset();
  }
);
</script>
