<template>
  <v-app>
    <AppBar />
    <v-main>
      <router-view />
    </v-main>
    <AppFooter />
  </v-app>
</template>

<script lang="ts" setup>
import Algo from "@/services/Algo";
import { useWallet } from "@txnlab/use-wallet-vue";
import { modelsv2 } from "algosdk";
import { fetchAsync } from "./utils";

const store = useAppStore();
const router = useRouter();
const { activeAccount } = useWallet();

async function refresh() {
  if (activeAccount.value?.address) {
    store.loading++;
    const account = await Algo.algod
      .accountInformation(activeAccount.value.address)
      .do();
    store.account = modelsv2.Account.from_obj_for_encoding(account);
    store.loading--;
  } else {
    store.account = undefined;
    router.push("/");
  }
}

watch(
  () => store.refresh,
  () => refresh()
);

onBeforeMount(async () => {
  store.loading++;
  await store.getCache();
  store.refresh++;
  store.tinyman = await fetchAsync("https://asa-list.tinyman.org/assets.json");
  store.loading--;
});
</script>

<style>
a {
  color: #2196f3;
}

.no-uppercase {
  text-transform: unset !important;
}
</style>
