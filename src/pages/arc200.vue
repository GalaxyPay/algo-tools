<script setup lang="ts">
import { fetchAsync } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import { get, set } from "idb-keyval";
import { toast } from "vue-sonner";

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
    toast.error(err.message, { duration: 7000 });
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

<template>
  <div class="flex flex-col gap-4 p-4 pt-0">
    <Card class="bg-muted/50">
      <CardHeader>
        <CardTitle class="flex items-center">
          ARC200 Assets
          <div class="flex items-center ml-auto space-x-2">
            <Checkbox
              id="showHidden"
              v-model="showHidden"
              class="border-gray-500"
              :disabled="loading"
            />
            <Label for="showHidden">Show Hidden</Label>
          </div>
        </CardTitle>

        <CardDescription>Click asset to send</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          class="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4"
        >
          <Arc200AssetCard
            v-for="asset in showAssets"
            :key="Number(asset.contractId)"
            :asset="asset"
            :is-hidden="isHidden(asset.contractId)"
            @toggle-hidden="toggleHidden"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
