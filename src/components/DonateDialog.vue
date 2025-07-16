<script lang="ts" setup>
import { FormField } from "@/components/ui/form";
import { bigintAmount, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import { toTypedSchema } from "@vee-validate/zod";
import algosdk from "algosdk";
import { useForm } from "vee-validate";
import { toast } from "vue-sonner";
import * as z from "zod";

const { algodClient, activeAddress, transactionSigner } = useWallet();

const formSchema = toTypedSchema(
  z.object({
    amount: z.number().multipleOf(0.000001).min(0),
    note: z.string().optional(),
  })
);

const { handleSubmit, isFieldValid } = useForm({
  validationSchema: formSchema,
});

const disableSend = computed(() => !isFieldValid("amount"));

const donate = handleSubmit(async (values) => {
  try {
    const atc = new algosdk.AtomicTransactionComposer();
    const enc = new TextEncoder();
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    const note64 = values.note ? enc.encode(values.note) : undefined;
    const microAlgo = bigintAmount(values.amount, 6);
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
});
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="w-100">
      <form class="space-y-6" @submit="donate">
        <DialogHeader>
          <DialogTitle>Donate to AlgoTools</DialogTitle>
          <DialogDescription>
            How much would you like to give?
          </DialogDescription>
        </DialogHeader>
        <FormField
          v-slot="{ componentField }"
          name="amount"
          :validate-on-blur="false"
        >
          <FormItem>
            <FormControl>
              <Input
                type="number"
                step="any"
                placeholder="Amount"
                v-bind="componentField"
                autocomplete="off"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="note">
          <FormItem>
            <FormControl>
              <Textarea rows="2" placeholder="Note" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <DialogFooter>
          <DialogClose as-child>
            <Button :disabled="disableSend" variant="outline" type="submit">
              Send
            </Button>
          </DialogClose>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
