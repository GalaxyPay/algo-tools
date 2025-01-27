<template>
  <v-container>
    <v-card v-if="store.account">
      <v-form ref="form" @submit.prevent="compose()">
        <v-container>
          <v-row>
            <v-col>
              {{ `Your account is currently ${store.account.status}.` }}
              <v-container v-if="store.account.status == 'Online'">
                <v-row class="text-caption">
                  Expire Round:
                  {{ store.account.participation?.voteLastValid }}
                </v-row>
                <v-row class="text-caption">
                  Expire Date: {{ expireDt }}
                </v-row>
              </v-container>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" class="pt-0">
              <v-checkbox
                v-model.number="incentiveEligible"
                label="Make Incentive Eligible"
                density="comfortable"
                :hint="incentiveHint"
                persistent-hint
                :disabled="store.account?.incentiveEligible"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="part.voteFirst"
                label="First Round"
                :rules="[required]"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="part.voteLast"
                label="Last Round"
                :rules="[required]"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="part.voteKeyDilution"
                label="Key Dilution"
                :rules="[required]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="part.selectionKey"
                label="Selection Key"
                :rules="[required]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="part.voteKey"
                label="Voting Key"
                :rules="[required]"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="part.stateProofKey"
                label="State Proof Key"
                :rules="[required]"
              />
            </v-col>
          </v-row>
        </v-container>
        <v-card-actions>
          <div v-if="store.account">
            <span>
              <v-btn
                variant="plain"
                color="currentColor"
                :icon="mdiContentPaste"
                @click="pasteFromClipboard()"
              />
              <v-tooltip
                activator="parent"
                location="bottom"
                text="Paste all properties at once from the terminal and we'll try to
                  parse them for you"
              />
            </span>
            <v-btn
              v-if="store.account.status == 'Online'"
              text="Go Offline"
              color="red"
              @click="offline()"
            />
          </div>
          <v-spacer />
          <v-btn text="Send" type="submit" />
        </v-card-actions>
      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import Algo, { getParams } from "@/services/Algo";
import type { KeyRegTxn } from "@/types";
import { execAtc } from "@/utils";
import { mdiContentPaste } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";

const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();

const required = (v: any) => !!v || v === 0 || "Required";
const form = ref();
const part = ref<KeyRegTxn>({} as KeyRegTxn);
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
  if (!store.account?.participation || store.account.status !== "Online")
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
  const { valid } = await form.value.validate();
  if (!valid) return;
  try {
    store.overlay = true;
    const suggestedParams = await getParams();
    const atc = new algosdk.AtomicTransactionComposer();
    part.value.sender = activeAccount.value!.address;
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
    await execAtc(atc, "Success");
    form.value.reset();
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}

async function calcAvgBlockTime() {
  const status = await Algo.algod.status().do();
  lastRound.value = status.lastRound;
  const currentRound = await Algo.algod.block(lastRound.value).do();
  const oldRound = await Algo.algod.block(lastRound.value - 100n).do();
  avgBlockTime.value =
    Math.floor(
      Number(
        currentRound.block.header.timestamp - oldRound.block.header.timestamp
      )
    ) * 10;
}

async function offline() {
  try {
    store.overlay = true;
    const suggestedParams = await getParams();
    const atc = new algosdk.AtomicTransactionComposer();
    const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      sender: activeAccount.value!.address,
      suggestedParams,
      nonParticipation: false,
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, "Successfully Offline");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}
</script>
