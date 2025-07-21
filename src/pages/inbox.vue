<script lang="ts" setup>
import { Arc59Factory } from "@/clients/Arc59Client";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { mdiContentSave } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { modelsv2 } from "algosdk";
import { set } from "idb-keyval";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();

const inboxInfo = ref<modelsv2.Account>();

async function getInbox() {
  if (!activeAddress.value) return;
  if (!store.network.inboxRouter) return;
  let inbox: string;
  inboxInfo.value = undefined;
  try {
    const boxName = algosdk.decodeAddress(activeAddress.value).publicKey;
    const resp = await algodClient.value
      .getApplicationBoxByName(store.network.inboxRouter, boxName)
      .do();
    inbox = algosdk.encodeAddress(resp.value);
  } catch {
    return;
  }
  inboxInfo.value = await algodClient.value.accountInformation(inbox).do();
}

async function createRouter() {
  let toastId: number | string | undefined = undefined;
  try {
    store.overlay = true;
    if (!store.account) throw Error("Invalid Account");
    const algorand = AlgorandClient.fromClients({ algod: algodClient.value });
    algorand.setDefaultSigner(transactionSigner);
    algorand.setDefaultValidityWindow(1000);
    const factory = new Arc59Factory({
      defaultSender: store.account.address,
      algorand,
    });
    toastId = toast.info("Processing...", {
      duration: Infinity,
    });
    const { result } = await factory.send.create.createApplication();
    store.network.inboxRouter = Number(result.appId);
    setRouter();
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
  toast.dismiss(toastId);
  store.overlay = false;
}

async function setRouter() {
  await set("network", JSON.parse(JSON.stringify(store.network)));
  store.refresh++;
  toast.success("Router ID Set");
}

watch(
  () => store.refresh,
  () => {
    getInbox();
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-4 p-4 pt-0">
    <Card class="bg-muted/50">
      <CardHeader>
        <CardTitle> Asset Inbox </CardTitle>
        <CardDescription>
          View and claim assets sent to your inbox
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!inboxInfo?.assets?.length" class="text-center italic">
          Your Inbox is Empty
        </div>
        <div
          class="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4"
        >
          <InboxAsset
            v-for="n in inboxInfo?.assets?.length"
            :key="n"
            :inbox-info="inboxInfo!"
            :idx="n - 1"
          />
        </div>
      </CardContent>
    </Card>
    <Card v-if="store.network.name === 'LocalNet'" class="bg-muted/50">
      <CardHeader>
        <CardTitle> LocalNet Router Config </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-evenly">
          <div>
            <Button variant="secondary" @click="createRouter()">
              Create New
            </Button>
          </div>
          <div>OR</div>
          <div>
            <Input
              v-model.number="store.network.inboxRouter"
              placeholder="Existing App ID"
              :append-inner-icon="mdiContentSave"
              @click:append-inner="setRouter()"
              @keyup.enter="setRouter()"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
