<script lang="ts" setup>
import type { KeyRegTxn } from "@/types";
import { execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import { ClipboardPaste } from "lucide-vue-next";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();

const emptyKeyReg = {
  voteKey: "",
  selectionKey: "",
  stateProofKey: "",
  voteFirst: undefined,
  voteLast: undefined,
  voteKeyDilution: undefined,
} as KeyRegTxn;
const part = ref(emptyKeyReg);
const incentiveEligible = ref(false);
const incentiveHint = computed(() =>
  store.account?.incentiveEligible
    ? "Already Eligible"
    : incentiveEligible.value
    ? "This will increase the fee of this transaction to 2 Algo"
    : ""
);

const lastRound = ref<bigint>();
const avgBlockTime = ref();

const expireDt = computed(() => {
  if (
    !store.account?.participation ||
    store.account.status !== "Online" ||
    !avgBlockTime.value
  )
    return undefined;
  const expireMs =
    (Number(store.account.participation.voteLastValid) -
      Number(lastRound.value)) *
    avgBlockTime.value;
  return `${new Date(Date.now() + expireMs).toLocaleString()} (${Math.round(
    expireMs / (24 * 60 * 60 * 1000)
  )} days)`;
});

watch(
  () => store.refresh,
  () => calcAvgBlockTime(),
  { immediate: true }
);

async function pasteFromClipboard() {
  const clip = await navigator.clipboard.readText();
  part.value.voteFirst = Number(clip.match(/(?<=^First\sround:\s*)\d*$/gm)![0]);
  part.value.voteLast = Number(clip.match(/(?<=^Last\sround:\s*)\d*$/gm)![0]);
  part.value.voteKeyDilution = Number(
    clip.match(/(?<=^Key\sdilution:\s*)\d*$/gm)![0]
  );
  part.value.selectionKey = clip.match(/(?<=^Selection\skey:\s*)[^\s]*$/gm)![0];
  part.value.voteKey = clip.match(/(?<=^Voting\skey:\s*)[^\s]*$/gm)![0];
  part.value.stateProofKey = clip.match(
    /(?<=^State\sproof\skey:\s*)[^\s]*$/gm
  )![0];
}

function b64ToUint8(b64: string | undefined) {
  return b64 ? Buffer.from(b64, "base64") : undefined;
}

async function compose() {
  try {
    console.log(Object.values(part.value));
    if (!Object.values(part.value).every((val) => val))
      throw Error("All fields are required");
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    part.value.sender = activeAddress.value!;
    if (incentiveEligible.value) {
      suggestedParams.flatFee = true;
      suggestedParams.fee = 2n * 10n ** 6n;
    }
    const obj = {
      ...(part.value as any),
      voteKey: b64ToUint8(part.value.voteKey),
      selectionKey: b64ToUint8(part.value.selectionKey),
      stateProofKey: b64ToUint8(part.value.stateProofKey),
      suggestedParams,
    };
    const txn =
      algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(obj);
    if (!txn) throw Error("Invalid Transaction");
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, algodClient.value, "Success");
    part.value = emptyKeyReg;
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
}

async function calcAvgBlockTime() {
  const status = await algodClient.value.status().do();
  lastRound.value = status.lastRound;
  const currentRound = await algodClient.value.block(lastRound.value).do();
  const oldRound = await algodClient.value.block(lastRound.value - 100n).do();
  avgBlockTime.value =
    Math.floor(
      Number(
        currentRound.block.header.timestamp - oldRound.block.header.timestamp
      )
    ) * 10;
}

async function offline() {
  try {
    const suggestedParams = await algodClient.value.getTransactionParams().do();
    const atc = new algosdk.AtomicTransactionComposer();
    const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      sender: activeAddress.value!,
      suggestedParams,
      nonParticipation: false,
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, algodClient.value, "Account Offline");
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4 pt-0">
    <Card class="bg-muted/50" v-if="store.account">
      <CardHeader>
        <CardTitle>Participation Keys</CardTitle>
        <CardDescription>
          {{ `Your account is currently ${store.account.status}.` }}
          <div v-if="store.account.status == 'Online'">
            <div class="text-caption">
              Expire Round:
              {{ store.account.participation?.voteLastValid }}
            </div>
            <div class="text-caption">Expire Date: {{ expireDt }}</div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="items-center flex gap-x-2">
          <Checkbox
            id="eligible"
            class="border-gray-500"
            v-model="incentiveEligible"
            :disabled="store.account?.incentiveEligible"
          />
          <Label for="eligible">Make Incentive Eligible</Label>
        </div>
        <div class="text-sm text-muted-foreground pt-1 pl-6">
          {{ incentiveHint }}
        </div>
        <div class="flex flex-col gap-4 pt-4">
          <div class="grid auto-rows-min gap-4 md:grid-cols-3">
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="voteFirst">First Round</Label>
              <Input id="voteFirst" v-model.number="part.voteFirst" />
            </div>
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="voteLast">Last Round</Label>
              <Input id="voteLast" v-model.number="part.voteLast" />
            </div>
            <div class="grid w-full max-w-sm items-center gap-1.5">
              <Label for="voteKeyDilution">Key Dilution</Label>
              <Input
                id="voteKeyDilution"
                v-model.number="part.voteKeyDilution"
              />
            </div>
          </div>
          <div class="grid auto-rows-min gap-4 md:grid-cols-2">
            <div class="grid w-full items-center gap-1.5">
              <Label for="selectionKey">Selection Key</Label>
              <Input id="selectionKey" v-model.number="part.selectionKey" />
            </div>
            <div class="grid w-full items-center gap-1.5">
              <Label for="voteKey">Voting Key</Label>
              <Input id="voteKey" v-model.number="part.voteKey" />
            </div>
          </div>
          <div class="grid w-full items-center gap-1.5">
            <Label for="stateProofKey">State Proof Key</Label>
            <Input id="stateProofKey" v-model.number="part.stateProofKey" />
          </div>
        </div>
      </CardContent>
      <CardFooter class="justify-between">
        <div class="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger as-child>
              <ClipboardPaste @click="pasteFromClipboard()" />
            </TooltipTrigger>
            <TooltipContent>
              Paste all properties at once from the terminal and we'll try to
              parse them for you
            </TooltipContent>
          </Tooltip>
          <Button
            v-if="store.account.status == 'Online'"
            variant="destructive"
            @click="offline()"
          >
            Go Offline
          </Button>
        </div>
        <Button variant="secondary" @click="compose()">Send</Button>
      </CardFooter>
    </Card>
  </div>
</template>
