<script lang="ts" setup>
import { bigintAmount, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { toast } from "vue-sonner";

const { algodClient, activeAddress, transactionSigner } = useWallet();

const amount = ref<number>();
const note = ref<string>();
const amountRequired = ref(false);

async function donate() {
  try {
    if (amount.value == null) {
      amountRequired.value = true;
      return;
    }
    amountRequired.value = false;
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
    await execAtc(atc, algodClient.value, "Thank you for your donation!");
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
}
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="w-100">
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
          v-model="amount"
        />
        <div v-show="amountRequired" class="pl-2 -mt-5 text-red-500 text-xs">
          Required
        </div>
        <Textarea rows="2" placeholder="Note" v-model="note" />
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="donate()">Send</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
