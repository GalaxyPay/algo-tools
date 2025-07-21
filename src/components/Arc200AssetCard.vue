<script lang="ts" setup>
import Algo from "@/services/Algo";
import { bigintAmount, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { Circle, CircleOff, X } from "lucide-vue-next";
import { arc200 as Contract } from "ulujs";
import { toast } from "vue-sonner";

const props = defineProps({
  asset: { type: Object, required: true },
  isHidden: { type: Boolean, required: true },
});

const emit = defineEmits(["toggleHidden"]);

const showSend = ref(false);
const amount = ref();
const receiver = ref();
const creator = ref(false);
const { algodClient, activeAddress, transactionSigner } = useWallet();

watch(
  creator,
  (val) => (receiver.value = val ? props.asset.params.creator : undefined)
);

function maxAmount() {
  amount.value = props.asset.balance / 10 ** props.asset.params.decimals;
}

async function sendAsset() {
  try {
    if (!activeAddress.value) throw Error("Invalid Account");
    const contract = new Contract(
      props.asset.contractId,
      algodClient.value,
      Algo.indexer,
      { acc: { addr: activeAddress.value, sk: new Uint8Array() } }
    );
    const amt = bigintAmount(amount.value, props.asset.params.decimals);
    const sim = await contract.arc200_transfer(receiver.value, amt, true, true);
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
      await execAtc(atc, algodClient.value, "Asset Sent");
    }
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
}

function handleClose() {
  showSend.value = false;
  amount.value = undefined;
  creator.value = false;
  receiver.value = undefined;
}
</script>

<template>
  <Card
    class="flex flex-1 px-4 py-2 bg-muted/50 hover:bg-accent cursor-pointer"
    @click="showSend = true"
  >
    <div class="flex flex-1 flex-col">
      <div class="flex flex-1 gap-1 items-center font-bold">
        <div>{{ asset.params.name }} ({{ asset.contractId }})</div>
        <div
          @click.stop="emit('toggleHidden', asset.contractId)"
          class="ml-auto"
        >
          <Tooltip v-if="isHidden">
            <TooltipTrigger as-child>
              <Circle :size="15" />
            </TooltipTrigger>
            <TooltipContent>Unhide</TooltipContent>
          </Tooltip>
          <Tooltip v-else>
            <TooltipTrigger as-child>
              <CircleOff :size="15" />
            </TooltipTrigger>
            <TooltipContent>Hide</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div class="text-xs text-muted-foreground">
        {{ asset.balance / 10 ** asset.params.decimals }}
        {{ asset.params.symbol }}
      </div>
    </div>
  </Card>
  <Dialog :open="showSend">
    <DialogContent class="!max-w-[530px] [&>button]:hidden">
      <div
        class="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100"
        @click="handleClose()"
      >
        <X :size="18" />
      </div>
      <DialogHeader>
        <DialogTitle>Send Asset</DialogTitle>
        <DialogDescription>{{ asset.params.name }}</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-4">
        <div class="flex w-full items-center gap-1.5">
          <Input
            type="number"
            step="any"
            placeholder="Amount"
            autocomplete="off"
            v-model.number="amount"
          />
          <Button variant="ghost" @click="maxAmount()">Max</Button>
        </div>
        <Input
          v-model="receiver"
          :disabled="creator"
          placeholder="Address"
          class="font-mono"
        />
        <div class="flex items-center space-x-2">
          <Checkbox
            id="creator"
            class="border-gray-500"
            v-model="creator"
            label="Send back to creator"
          />
          <Label for="creator">Send back to creator</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="sendAsset()">Submit</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
