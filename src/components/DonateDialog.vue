<script lang="ts" setup>
import { getParams } from "@/services/Algo";
import { bigintAmount, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";

const store = useAppStore();
const { activeAddress, transactionSigner } = useWallet();
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
    const microAlgo = bigintAmount(amount.value, 6);
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      receiver: "TOOLSGOIPA6BC2JHR4QZYWNYJQRKLTA7NQ44EDRUQCR2R26Y4Y5OAIE6MM",
      sender: activeAddress.value!,
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

<template>
  <Dialog>
    <DialogTrigger :as-child="true">
      <slot />
    </DialogTrigger>
    <DialogContent class="w-100">
      <form ref="form" @submit.prevent="donate()">
        <DialogHeader>
          <DialogTitle>Donate to AlgoTools</DialogTitle>
          <DialogDescription>
            How much would you like to give?
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col px-3 py-6 gap-4">
          <Input
            v-model.number="amount"
            type="number"
            placeholder="Amount"
            :rules="[required]"
          />
          <Textarea v-model="note" rows="2" placeholder="Note" />
        </div>
        <DialogFooter>
          <DialogClose></DialogClose>
          <Button variant="outline" type="submit">Send</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
