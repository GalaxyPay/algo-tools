<template>
  <v-dialog v-model="showAddListing" max-width="800" persistent>
    <v-card>
      <v-card-title>Add Listing</v-card-title>
      <v-form ref="form" @submit.prevent="sell()">
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="vanity.mnemonic"
                rows="2"
                label="Vanity Mnemonic"
                hint="The buyer needs this to be able to import and use the account"
                :rules="[required, validMnemonic, notSelf]"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="vanityAddr"
                label="Vanity Address"
                readonly
                hint="Calculated from the mnemonic. This account must hold at least .3285 Algo."
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model.number="vanity.price"
                type="number"
                label="Price (in Algo)"
                hint="5% fee is charged at time of listing. If listing is removed, fee is refunded."
                :rules="[required]"
              />
            </v-col>
          </v-row>
        </v-container>
        <v-card-actions>
          <v-spacer />
          <v-btn text="Cancel" color="grey" @click="showAddListing = false" />
          <v-btn text="Post" type="submit" />
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { vanityAbi } from "@/data";
import Algo, { getParams } from "@/services/Algo";
import { bigintAmount, delay, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";

const props = defineProps({
  visible: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);

const showAddListing = computed({
  get() {
    return props.visible;
  },
  set(value) {
    if (!value) {
      form.value.reset();
      emit("close");
    }
  },
});

const store = useAppStore();
const { activeAddress, transactionSigner } = useWallet();
const vanity = ref<{ mnemonic?: string; price?: number }>({});
const required = (v: any) => !!v || "Required";
const validMnemonic = () => !!m2a.value?.addr || "Invalid Mnemonic";
const notSelf = () =>
  m2a.value?.addr.toString() != activeAddress.value || "Can't List Self";
const form = ref();

const vanityAddr = computed({
  get() {
    return m2a.value?.addr;
  },
  set() {},
});
const m2a = computed(() => {
  if (!vanity.value.mnemonic) return undefined;
  let val;
  try {
    val = algosdk.mnemonicToSecretKey(vanity.value.mnemonic);
  } catch {
    return undefined;
  }
  return val;
});

async function sell() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  try {
    if (!m2a.value) throw Error("Invalid Account");
    if (!store.network.vanityId) throw Error("Network not supported");
    store.overlay = true;
    const vanityInfo = await Algo.algod.accountInformation(m2a.value.addr).do();
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await getParams();

    suggestedParams.fee = suggestedParams.minFee * 2n;
    suggestedParams.flatFee = true;
    const appAddr = algosdk.getApplicationAddress(store.network.vanityId);
    const price = bigintAmount(vanity.value.price!, 6);
    const tax = Math.floor(Number(price) / 20);

    const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: activeAddress.value!,
      suggestedParams,
      receiver: appAddr,
      amount: tax,
    });

    const txnWithSigner = { txn: payTxn, signer: transactionSigner };
    const key = m2a.value.sk.slice(0, 32);
    const optedIn = vanityInfo.appsLocalState?.some(
      (s) => Number(s.id) === store.network.vanityId
    );
    const optinOrNoop = optedIn
      ? algosdk.OnApplicationComplete.NoOpOC
      : algosdk.OnApplicationComplete.OptInOC;
    suggestedParams.fee = 0n;
    const method = vanityAbi.methods.find((m) => m.name == "post");
    if (!method) throw Error("Invalid Method");
    atc.addMethodCall({
      appID: store.network.vanityId,
      sender: m2a.value.addr,
      method,
      methodArgs: [txnWithSigner, activeAddress.value!, price, key],
      suggestedParams,
      rekeyTo: appAddr,
      onComplete: optinOrNoop,
      signer: transactionSigner,
    });
    await execAtc(atc, "Successfully Listed Account");
    await delay(4000);
    store.refresh++;
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  form.value.reset();
  showAddListing.value = false;
  store.overlay = false;
}
</script>
