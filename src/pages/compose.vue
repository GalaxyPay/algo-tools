<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" sm="6">
        <v-select
          v-model="txnType"
          label="Transaction Type"
          placeholder="Choose a type..."
          persistent-placeholder
          :items="txnTypes"
          return-object
        />
      </v-col>
    </v-row>
    <v-card v-if="txnType">
      <v-form ref="form" @submit.prevent="compose()">
        <v-container>
          <v-autocomplete
            v-if="txnType.fields.includes('assetId')"
            v-model="asset"
            :items="assets"
            :item-props="itemProps"
            label="Asset"
            :rules="[required]"
            :hint="itemBalance(asset)"
            persistent-hint
            variant="outlined"
            class="pb-3"
          />
          <v-text-field
            v-if="txnType.fields.includes('to')"
            v-model="to"
            label="To Address"
            :rules="[required, validAddress]"
          />
          <v-text-field
            v-if="txnType.fields.includes('amount')"
            v-model.number="amount"
            type="number"
            :label="amountLabel"
            :rules="[required]"
          />
          <v-text-field
            v-if="txnType.fields.includes('rekey')"
            v-model="rekeyTo"
            label="Rekey To"
            :rules="[required, validAddress]"
          />
          <v-checkbox-btn
            v-if="txnType.fields.includes('note')"
            v-model="showNote"
            label="Note"
            @update:model-value="note = undefined"
          />
          <v-textarea v-if="showNote" v-model="note" rows="2" label="Note" />
          <v-checkbox-btn
            v-if="txnType.fields.includes('close')"
            v-model="showCloseRemainderTo"
            @update:model-value="closeRemainderTo = undefined"
          >
            <template #label>
              Close Remainder To
              <span>
                <v-icon size="x-small" class="ml-2" :icon="mdiInformation" />
                <v-tooltip
                  activator="parent"
                  location="bottom"
                  :text="closeRemainderToTip"
                />
              </span>
            </template>
          </v-checkbox-btn>
          <v-text-field
            v-if="showCloseRemainderTo"
            v-model="closeRemainderTo"
            label="Close Remainder To"
            :rules="[validAddress]"
          />
          <v-checkbox-btn
            v-if="txnType.fields.includes('revoke')"
            v-model="showRevocationTarget"
            @update:model-value="revocationTarget = undefined"
          >
            <template #label>
              Revocation Target
              <span>
                <v-icon size="x-small" class="ml-2" :icon="mdiInformation" />
                <v-tooltip
                  activator="parent"
                  location="bottom"
                  text="Specify this field to indicate a clawback transaction. This is
                  the address from which the funds will be withdrawn."
                />
              </span>
            </template>
          </v-checkbox-btn>
          <v-text-field
            v-if="showRevocationTarget"
            v-model="revocationTarget"
            label="Revocation Target"
            :rules="[validAddress]"
          />
          <div v-if="txnType.fields.includes('part') && store.account">
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
          </div>
        </v-container>
        <v-card-actions>
          <div v-if="txnType.fields.includes('part') && store.account">
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
import { KeyRegTxn } from "@/types";
import { execAtc, getAssetInfo } from "@/utils";
import { mdiContentPaste, mdiInformation } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";

const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();

const required = (v: any) => !!v || v === 0 || "Required";
const validAddress = (v: string) =>
  algosdk.isValidAddress(v) || "Invalid Address";
const to = ref();
const amount = ref();
const note = ref();
const showNote = ref(false);
const rekeyTo = ref();
const closeRemainderTo = ref();
const showCloseRemainderTo = ref(false);
const revocationTarget = ref();
const showRevocationTarget = ref(false);
const form = ref();
const txnTypes = ref([
  { title: "Payment", type: "pay", fields: ["to", "amount", "note", "close"] },
  {
    title: "Asset Transfer",
    type: "axfer",
    fields: ["assetId", "to", "amount", "note", "close", "revoke"],
  },
  { title: "Key Registration", type: "keyreg", fields: ["part"] },
  { title: "Rekey", type: "rekey", fields: ["rekey", "note"] },
]);
const txnType = ref();
const part = ref<KeyRegTxn>({} as KeyRegTxn);

const amountLabel = computed(() => {
  let val = "Amount";
  if (txnType.value.title == "Payment") {
    val += " (Algo)";
  } else if (asset.value) {
    val += ` (${asset.value.params.unitName})`;
  }
  return val;
});
const closeRemainderToTip = computed(() =>
  txnType.value.title == "Payment"
    ? `Specify this field to close the sending account, and transfer all
      remaining funds, after the fee and amount are paid, to this address.`
    : `Specify this field to remove the asset holding from the sending
      account (opt-out), and transfer remainder of asset, after amount is
      paid, to this address.`
);

const lastRound = ref();
const avgBlockTime = ref();

const expireDt = computed(() => {
  if (!store.account?.participation || store.account.status !== "Online")
    return undefined;
  const expireMs =
    (Number(store.account.participation.voteLastValid) - lastRound.value) *
    avgBlockTime.value;
  return `${new Date(Date.now() + expireMs).toLocaleString()} (${Math.round(
    expireMs / (24 * 60 * 60 * 1000)
  )} days)`;
});

watch(txnType, () => {
  form.value?.reset();
  asset.value = undefined;
});

watch(
  () => store.refresh,
  () => calcAvgBlockTime(),
  { immediate: true }
);

watch(
  () => store.account,
  async () => {
    if (!store.account?.assets) return;
    await Promise.all(
      store.account.assets.map(async (a) => {
        if (a.amount > 0) {
          const asset = await getAssetInfo(Number(a.assetId));
          if (asset) assets.value.push(asset);
        }
      })
    );
  },
  { immediate: true }
);

const assets = ref<modelsv2.Asset[]>([]);
const asset = ref<modelsv2.Asset>();

function itemProps(item: modelsv2.Asset) {
  return {
    title: item.params.name,
    subtitle: item.index,
  };
}

function itemBalance(item: modelsv2.Asset | undefined) {
  if (!item || !store.account) return undefined;
  return `Balance:
  ${
    Number(
      store.account.assets?.find((a) => a.assetId === item.index)?.amount
    ) /
    10 ** Number(item.params.decimals)
  }
  ${item.params.unitName}`;
}

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

async function compose() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  try {
    store.overlay = true;
    const enc = new TextEncoder();
    const suggestedParams = await getParams();
    const note64 = note.value ? enc.encode(note.value) : undefined;
    const atc = new algosdk.AtomicTransactionComposer();
    let txn;
    switch (txnType.value.title) {
      case "Payment":
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          to: to.value,
          from: activeAccount.value!.address,
          note: note64,
          suggestedParams,
          amount: amount.value * 10 ** 6,
          closeRemainderTo: closeRemainderTo.value,
        });
        break;
      case "Rekey":
        txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          to: activeAccount.value!.address,
          from: activeAccount.value!.address,
          note: note64,
          suggestedParams,
          amount: 0,
          rekeyTo: rekeyTo.value,
        });
        break;
      case "Asset Transfer":
        if (!asset.value) throw Error("Invalid Asset");
        txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          assetIndex: Number(asset.value.index),
          to: to.value,
          from: activeAccount.value!.address,
          note: note64,
          suggestedParams,
          amount: amount.value * 10 ** Number(asset.value.params.decimals),
          closeRemainderTo: closeRemainderTo.value,
          revocationTarget: revocationTarget.value,
        });
        break;
      case "Key Registration": {
        part.value.from = activeAccount.value!.address;
        const obj = {
          ...(part.value as any),
          suggestedParams,
        };
        txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject(obj);
        break;
      }
    }
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
  lastRound.value = status["last-round"];
  const currentRound = await Algo.algod.block(lastRound.value).do();
  const oldRound = await Algo.algod.block(lastRound.value - 100).do();
  avgBlockTime.value =
    Math.floor(currentRound.block.ts - oldRound.block.ts) * 10;
}

async function offline() {
  try {
    store.overlay = true;
    const suggestedParams = await getParams();
    const atc = new algosdk.AtomicTransactionComposer();
    const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      from: activeAccount.value!.address,
      suggestedParams,
      nonParticipation: false,
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, "Successfuly Offline");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}
</script>
