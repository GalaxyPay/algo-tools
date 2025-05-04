<template>
  <v-container>
    <v-card :loading="loading">
      <v-card-title class="d-flex">
        Assets <v-spacer />
        <v-checkbox-btn
          v-model="showHidden"
          label="Show Hidden"
          class="justify-end"
          :disabled="loading"
        />
      </v-card-title>
      <v-container>
        <v-row>
          <v-col
            v-for="asset in showAssets"
            :key="Number(asset.contractId)"
            cols="12"
            md="6"
            lg="4"
          >
            <Arc200AssetCard
              :asset="asset"
              :is-hidden="isHidden(asset.contractId)"
              @toggle-hidden="toggleHidden"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { fetchAsync } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import { get, set } from "idb-keyval";

const store = useAppStore();
const { activeAddress } = useWallet();
const loading = ref(true);
const showHidden = ref(false);
const hidden = ref<number[]>([]);

const assets = ref<any[]>([]);

const showAssets = computed(() =>
  assets.value.filter(
    (b: any) => showHidden.value || !hidden.value.includes(b.contractId)
  )
);

async function getAssets() {
  try {
    loading.value = true;
    assets.value = [];
    const apiUrl = store.network.nftIndexer;
    if (!apiUrl) throw Error("Network not supported");
    hidden.value = JSON.parse(
      JSON.stringify((await get("arc200Hidden")) || [])
    );
    const { tokens } = await fetchAsync(`${apiUrl}/arc200/tokens`);
    const { balances } = await fetchAsync(
      `${apiUrl}/arc200/balances?accountId=${activeAddress.value}`
    );
    assets.value = balances.map((b: any) => ({
      ...b,
      params: tokens.find((t: any) => t.contractId === b.contractId),
    }));
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  loading.value = false;
}

onBeforeMount(async () => {
  hidden.value = JSON.parse(JSON.stringify((await get("arc200Hidden")) || []));
  const apiUrl = store.network.nftIndexer;
  const { tokens } = await fetchAsync(`${apiUrl}/arc200/tokens`);
  const { balances } = await fetchAsync(
    `${apiUrl}/arc200/balances?accountId=${activeAddress.value}`
  );
  assets.value = balances.map((b: any) => ({
    ...b,
    params: tokens.find((t: any) => t.contractId === b.contractId),
  }));
  loading.value = false;
});

async function toggleHidden(id: number) {
  const idx = hidden.value.indexOf(id);
  if (idx === -1) {
    hidden.value.push(id);
  } else {
    hidden.value.splice(idx, 1);
  }
  await set("arc200Hidden", JSON.parse(JSON.stringify(hidden.value)));
}

function isHidden(id: number) {
  return hidden.value.includes(id);
}

watch(
  () => store.refresh,
  async () => await getAssets()
);
</script>
