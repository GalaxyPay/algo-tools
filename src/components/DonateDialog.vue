<script lang="ts" setup>
import { bigintAmount, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { X } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();

const amount = ref<number>();
const note = ref<string>();
const amountError = ref<string>();

async function donate() {
  try {
    if (amount.value == null) {
      amountError.value = "Required";
      return;
    }
    amountError.value = undefined;
    const atc = new algosdk.AtomicTransactionComposer();
    const enc = new TextEncoder();
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    const note64 = note ? enc.encode(note.value) : undefined;
    const microAlgo = bigintAmount(amount.value, 6);
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      receiver: "TOOLSGOIPA6BC2JHR4QZYWNYJQRKLTA7NQ44EDRUQCR2R26Y4Y5OAIE6MM",
      sender: activeAddress.value!,
      note: note64,
      suggestedParams,
      amount: microAlgo,
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    close();
    await execAtc(atc, algodClient.value, "Thank you for your donation!");
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
}

function close() {
  store.showDonate = false;
  amount.value = undefined;
  amountError.value = undefined;
  note.value = undefined;
}
</script>

<template>
  <Dialog :open="store.showDonate">
    <DialogContent class="w-100 [&>button]:hidden">
      <div
        class="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
        @click="close()"
      >
        <X :size="18" />
      </div>
      <DialogHeader>
        <DialogTitle>Donate to AlgoTools</DialogTitle>
        <DialogDescription>
          How much would you like to give?
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-6">
        <Input
          type="number"
          step="any"
          placeholder="Amount"
          autocomplete="off"
          v-model.number="amount"
        />
        <div v-show="amountError" class="pl-2 -mt-5 text-red-500 text-xs">
          {{ amountError }}
        </div>
        <Textarea rows="2" placeholder="Note" v-model="note" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="donate()">Send</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
