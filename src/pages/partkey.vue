<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex">
        Participation Keys <v-spacer />
        <v-btn
          :icon="mdiPlus"
          variant="plain"
          :disabled="unauth"
          @click="generateDialog"
        />
      </v-card-title>
      <v-container v-if="unauth">
        <v-card-text>{{ message }}</v-card-text>
      </v-container>
      <v-container v-else>
        <v-data-table
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
              :icon="mdiCheck"
            />
          </template>
          <template #[`item.expire`]="{ item }">
            {{ expireDt(Number(item.key.voteLastValid)) }}
          </template>
          <template #[`item.actions`]="{ item }">
            <span>
              <v-btn
                variant="plain"
                :icon="mdiContentCopy"
                color="currentColor"
                @click="copyToClipboard(item.key)"
              />
              <v-tooltip
                activator="parent"
                location="bottom"
                text="Copy Key Details"
              />
            </span>
            <span v-if="!altActive">
              <v-btn
                variant="plain"
                :icon="mdiHandshake"
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
                :icon="mdiDelete"
                :disabled="isActiveKey(item.key)"
                color="error"
                @click="deleteKey(item.id)"
              />
              <v-tooltip activator="parent" location="bottom" text="Delete" />
            </span>
          </template>
        </v-data-table>
        <v-form ref="altForm" @submit.prevent="manage">
          <v-row class="pt-3" justify="center">
            <v-col cols="12" class="pb-0">
              <v-checkbox
                v-model="manageAlt"
                label="Manage keys for an account that you don't have in your wallet
        (e.g. Folks Escrow)"
              />
            </v-col>
            <v-col v-if="manageAlt" cols="10" class="pt-0">
              <v-text-field
                v-model="altAddr"
                label="Address"
                :disabled="altActive"
                :rules="[required, validAddress]"
              />
            </v-col>
          </v-row>
          <v-card-actions v-if="manageAlt && !altActive">
            <v-spacer />
            <v-btn text="Manage" type="submit" />
          </v-card-actions>
        </v-form>
      </v-container>
    </v-card>
    <v-dialog v-model="showGenerate" max-width="400" persistent>
      <v-card :disabled="loading">
        <v-card-title class="d-flex">
          Generate Participation Key
          <v-spacer />
          <v-icon color="currentColor" :icon="mdiClose" @click="resetAll()" />
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
import {
  mdiCheck,
  mdiClose,
  mdiContentCopy,
  mdiDelete,
  mdiHandshake,
  mdiPlus,
} from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { decodeJSON, modelsv2, stringifyJSON } from "algosdk";

const store = useAppStore();
const { activeAccount, transactionSigner } = useWallet();

const loading = ref();
const unauth = ref(false);
const keys = ref<any[]>();
const showGenerate = ref(false);
const form = ref();
const gen = ref<{ first?: number; last?: number }>({});
const lastRound = ref<number>();

const altForm = ref();
const manageAlt = ref(false);
const altAddr = ref<string>();
const altActive = ref(false);

const validAddress = (v: string) =>
  algosdk.isValidAddress(v) || "Invalid Address";

const headers = computed<any[]>(() => {
  const val = [
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
    {
      title: "Approx. Expire",
      key: "expire",
      sortable: false,
      align: "center",
    },
    { title: "Actions", key: "actions", sortable: false, align: "center" },
  ];
  if (altActive.value) val.shift();
  return val;
});

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
    const addr = altAddr.value || activeAccount.value!.address;
    keys.value = data
      .filter((p: any) => p.address === addr)
      .map((p: any) => ({
        ...p,
        key: decodeJSON(stringifyJSON(p.key), modelsv2.AccountParticipation),
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
  gen.value.last = lastRound.value! + 3 * 10 ** 6;
}

function isActiveKey(key: any) {
  if (!store.account) return false;
  return (
    key.voteParticipationKey.toString() ===
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
  lastRound.value = Number(status.lastRound);
}

async function generateKey() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  try {
    if (!activeAccount.value) throw Error("Invalid Account");
    loading.value = true;
    const addr = altAddr.value || activeAccount.value.address;
    await fetch(
      `${baseUrl.value}/generate/${addr}` +
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
      sender: item.address,
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
        sender: activeAccount.value!.address,
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
  const currentRound = await Algo.algod.block(lastRound.value!).do();
  const oldRound = await Algo.algod.block(lastRound.value! - 100).do();
  avgBlockTime.value =
    Math.floor(
      Number(
        currentRound.block.header.timestamp - oldRound.block.header.timestamp
      )
    ) * 10;
}

function expireDt(lastValid: number) {
  if (!lastRound.value) return "";
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
  navigator.clipboard.writeText(algosdk.encodeJSON(key));
  store.setSnackbar("Key Copied", "info", 1000);
}

watch(
  () => manageAlt.value,
  (val) => {
    if (!val) {
      altActive.value = false;
      altAddr.value = undefined;
    }
  }
);

watch(
  () => altActive.value,
  () => getKeys()
);

async function manage() {
  const { valid } = await altForm.value.validate();
  if (!valid) return;
  altActive.value = true;
}
</script>
