<script lang="ts" setup>
import { vanityAbi } from "@/data";
import { bigintAmount, delay, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { X } from "lucide-vue-next";
import { toast } from "vue-sonner";

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
      emit("close");
    }
  },
});

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();
const vanity = ref<{ mnemonic?: string; price?: number }>({});
const mnemonicValid = ref<true | string>(true);
const priceValid = ref<true | string>(true);

const required = (v: any) => !!v || "Required";
const validMnemonic = () => !!m2a.value?.addr || "Invalid Mnemonic";
const notSelf = () =>
  m2a.value?.addr.toString() != activeAddress.value || "Can't List Self";

const vanityAddr = computed(() => {
  mnemonicValid.value = true;
  return m2a.value?.addr.toString();
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

function validate() {
  // mnemonic
  mnemonicValid.value = required(vanity.value.mnemonic);
  if (mnemonicValid.value === true) mnemonicValid.value = validMnemonic();
  if (mnemonicValid.value === true) mnemonicValid.value = notSelf();
  // price
  priceValid.value = required(vanity.value.price);
  // all
  if (mnemonicValid.value === true && priceValid.value === true) return true;
  return false;
}

async function sell() {
  try {
    const valid = validate();
    if (!valid) return;
    if (!m2a.value) throw Error("Invalid Mnemonic");
    if (!store.network.vanityId) throw Error("Network not supported");
    const vanityInfo = await algodClient.value
      .accountInformation(m2a.value.addr)
      .do();
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await algodClient.value.getTransactionParams().do();

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
    await execAtc(atc, algodClient.value, "Account Listed");
    await delay(4000);
    store.refresh++;
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
  close();
}

function close() {
  showAddListing.value = false;
  vanity.value = {};
  mnemonicValid.value = true;
  priceValid.value = true;
}
</script>

<template>
  <Dialog :open="showAddListing">
    <DialogContent class="!max-w-[530px] [&>button]:hidden">
      <div
        class="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
        @click="close()"
      >
        <X :size="18" />
      </div>
      <DialogHeader>
        <DialogTitle>Add Listing</DialogTitle>
        <DialogDescription>Sell a Vanity Address</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-6">
        <div>
          <Textarea
            rows="2"
            placeholder="Vanity Mnemonic"
            v-model="vanity.mnemonic"
          />
          <div v-if="mnemonicValid === true" class="pl-2 mt-1 text-xs">
            The buyer needs this to be able to import and use the account
          </div>
          <div v-else class="pl-2 pt-1 text-red-500 text-xs">
            {{ mnemonicValid }}
          </div>
        </div>
        <div>
          <Input
            :model-value="vanityAddr"
            placeholder="Vanity Address"
            readonly
            class="font-mono"
          />
          <div class="ml-2 mt-1 text-xs">
            Calculated from the mnemonic. This account must hold at least .3285
            Algo.
          </div>
        </div>
        <div>
          <Input
            type="number"
            step="any"
            placeholder="Price (in Algo)"
            autocomplete="off"
            v-model.number="vanity.price"
          />
          <div v-if="priceValid === true" class="pl-2 mt-1 text-xs">
            The buyer needs this to be able to import and use the account
          </div>
          <div v-else class="pl-2 pt-1 text-red-500 text-xs">
            {{ priceValid }}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="sell()">Post</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
