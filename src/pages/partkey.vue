<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex">
        Participation Keys <v-spacer />
        <v-btn
          icon="mdi-plus"
          variant="plain"
          :disabled="unauth"
          @click="generateDialog"
        />
      </v-card-title>
      <v-container>
        <v-card-text v-if="unauth">{{ message }}</v-card-text>
        <v-data-table
          v-else
          :headers="headers"
          :items="keys"
          density="comfortable"
          no-data-text="No keys for this account"
          items-per-page="-1"
          hover
        >
          <template #bottom />
          <template #[`item.active`]="{ item }">
            <v-icon
              v-show="isActiveKey(item.key)"
              size="small"
              color="vuet"
              icon="mdi-check"
            />
          </template>
          <template #[`item.expire`]="{ item }">
            {{ expireDt(item.key.voteLastValid) }}
          </template>
          <template #[`item.actions`]="{ item }">
            <span>
              <v-btn
                variant="plain"
                icon="mdi-content-copy"
                color="currentColor"
                @click="copyToClipboard(item.key)"
              />
              <v-tooltip
                activator="parent"
                location="bottom"
                text="Copy Key Details"
              />
            </span>
            <span>
              <v-btn
                variant="plain"
                icon="mdi-handshake"
                color="currentColor"
                @click="registerKey(item)"
              />
              <v-tooltip
                activator="parent"
                location="bottom"
                :text="isActiveKey(item.key) ? 'Unregister' : 'Register'"
              />
            </span>
            <span>
              <v-btn
                variant="plain"
                icon="mdi-delete"
                :disabled="isActiveKey(item.key)"
                color="error"
                @click="deleteKey(item.id)"
              />
              <v-tooltip activator="parent" location="bottom" text="Delete" />
            </span>
          </template>
        </v-data-table>
      </v-container>
    </v-card>
    <v-dialog v-model="showGenerate" max-width="400" persistent>
      <v-card :disabled="loading">
        <v-card-title class="d-flex">
          Generate Participation Key
          <v-spacer />
          <v-icon color="currentColor" icon="mdi-close" @click="resetAll()" />
        </v-card-title>
        <v-form ref="form" @submit.prevent="generateKey()">
          <v-container>
            <v-text-field
              v-model="gen.first"
              type="number"
              label="First Valid"
              :rules="[required]"
            />
            <v-text-field
              v-model="gen.last"
              type="number"
              label="Last Valid"
              :rules="[required]"
            />
            <div class="text-caption">Most Recent Round: {{ lastRound }}</div>
            <v-btn
              text="Load Defaults"
              size="x-small"
              @click="loadDefaults()"
            />
          </v-container>
          <v-card-actions>
            <v-spacer />
            <v-btn text="Generate" type="submit" :loading="loading" />
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import Algo, { getParams } from "@/services/Algo";
import { delay, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";

const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();

const loading = ref();
const unauth = ref(false);
const keys = ref<any[]>();
const showGenerate = ref(false);
const form = ref();
const gen = ref<{ first?: number; last?: number }>({});
const lastRound = ref();

const headers: any[] = [
  { title: "Active", key: "active", sortable: false, align: "center" },
  {
    title: "First Valid",
    key: "key.voteFirstValid",
    sortable: false,
    align: "center",
  },
  {
    title: "Last Valid",
    key: "key.voteLastValid",
    sortable: false,
    align: "center",
  },
  { title: "Approx. Expire", key: "expire", sortable: false, align: "center" },
  { title: "Actions", key: "actions", sortable: false, align: "center" },
];

const required = (v: number) => !!v || v === 0 || "Required";

const message = computed(() => {
  if (unauth.value)
    return "You must be connected to your own node as the admin to use this tool";
  if (keys.value && !keys.value.length) return "No keys created";
  return null;
});
const baseUrl = computed(
  () =>
    `${store.network.algod.url}:${store.network.algod.port}/v2/participation`
);

async function getKeys() {
  unauth.value = false;
  const response = await fetch(baseUrl.value, {
    headers: { "X-Algo-Api-Token": store.network.algod.token },
  });
  if (response.ok) {
    const data = await response.json();
    keys.value = data
      .filter((p: any) => p.address === activeAccount.value!.address)
      .map((p: any) => ({
        ...p,
        key: modelsv2.AccountParticipation.from_obj_for_encoding(p.key),
      }))
      .sort((a: any, b: any) => b.key.voteLastValid - a.key.voteLastValid);
  } else {
    keys.value = undefined;
    unauth.value = true;
  }
}

onMounted(() => {
  getKeys();
  calcAvgBlockTime();
});

function loadDefaults() {
  gen.value.first = lastRound.value;
  gen.value.last = lastRound.value + 3 * 10 ** 6;
}

function isActiveKey(key: modelsv2.AccountParticipation) {
  if (!store.account) return false;
  return (
    key.voteParticipationKey.toString() ==
    store.account.participation?.voteParticipationKey.toString()
  );
}

async function deleteKey(id: string) {
  if (confirm("Are you sure you want to delete this key?")) {
    await fetch(`${baseUrl.value}/${id}`, {
      method: "DELETE",
      headers: { "X-Algo-Api-Token": store.network.algod.token },
    });
    await getKeys();
  }
}

async function generateDialog() {
  await getLastRound();
  showGenerate.value = true;
}

async function getLastRound() {
  const status = await Algo.algod.status().do();
  lastRound.value = status["last-round"];
}

async function generateKey() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  try {
    if (!activeAccount.value) throw Error("Invalid Account");
    loading.value = true;
    await fetch(
      `${baseUrl.value}/generate/${activeAccount.value.address}` +
        `?first=${gen.value.first}&last=${gen.value.last}`,
      {
        method: "POST",
        headers: { "X-Algo-Api-Token": store.network.algod.token },
      }
    ).then(async (response) => {
      if (response.ok) {
        let generating = true;
        while (generating) {
          await delay(2000);
          await getKeys();
          if (
            keys.value?.some(
              (k) =>
                k.key.voteFirstValid == gen.value.first &&
                k.key.voteLastValid == gen.value.last
            )
          )
            generating = false;
        }
        store.setSnackbar("New key generated", "success");
      } else {
        throw new Error(response.statusText);
      }
    });
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  resetAll();
}

async function registerKey(item: any) {
  try {
    if (isActiveKey(item.key)) {
      await offline();
      return;
    }
    store.overlay = true;
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await getParams();
    const txn = algosdk.makeKeyRegistrationTxnWithSuggestedParamsFromObject({
      from: item.address,
      suggestedParams,
      voteFirst: item.key.voteFirstValid,
      voteLast: item.key.voteLastValid,
      voteKeyDilution: item.key.voteKeyDilution,
      selectionKey: item.key.selectionParticipationKey,
      voteKey: item.key.voteParticipationKey,
      stateProofKey: item.key.stateProofKey,
    });
    atc.addTransaction({ txn, signer: transactionSigner });
    await execAtc(atc, "Successfuly Registered Key");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}

async function offline() {
  if (confirm("Are you sure you want to take this account offline?")) {
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
}

const avgBlockTime = ref();

async function calcAvgBlockTime() {
  await getLastRound();
  const currentRound = await Algo.algod.block(lastRound.value).do();
  const oldRound = await Algo.algod.block(lastRound.value - 100).do();
  avgBlockTime.value =
    Math.floor(currentRound.block.ts - oldRound.block.ts) * 10;
}

function expireDt(lastValid: number) {
  const expireMs = (lastValid - lastRound.value) * avgBlockTime.value;
  return new Date(Date.now() + expireMs).toLocaleString();
}

function resetAll() {
  form.value.reset();
  showGenerate.value = false;
  loading.value = false;
}

watch(
  () => store.account,
  async () => await getKeys()
);

watch(
  () => store.refresh,
  async () => await getKeys()
);

function copyToClipboard(key: modelsv2.AccountParticipation) {
  navigator.clipboard.writeText(JSON.stringify(key.get_obj_for_encoding()));
  store.setSnackbar("Key Copied", "info", 1000);
}
</script>
