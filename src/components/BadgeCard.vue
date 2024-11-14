<template>
  <v-card class="fill-height" color="#2B2B2B">
    <v-container>
      <v-row>
        <v-col cols="2" align-self="center">
          <v-img class="mx-auto" max-width="60" :src="image" />
        </v-col>
        <v-col cols="10" class="py-1">
          <v-container>
            <v-row no-gutters>
              <v-col class="pa-0">
                <v-row>
                  {{ badge.params.name }}
                </v-row>
                <v-row class="text-grey">
                  {{ badge.description }}
                  <v-col class="pb-0 text-center">
                    <v-btn text="Claim" @click="claim()" />
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-container>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts" setup>
import { LuteGovClient } from "@/clients/LuteGovClient";
import Algo from "@/services/Algo";
import type { Badge } from "@/types";
import { execAtc, ipfs2http } from "@/utils";
import { getAssetInfo } from "@/utils/assetInfo";
import { sha256 } from "@/utils/sha256";
import { populateAppCallResources } from "@algorandfoundation/algokit-utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk from "algosdk";
import MerkleTree from "merkletreejs";

const store = useAppStore();
const { transactionSigner } = useWallet();
const props = defineProps({
  badge: { type: Object as PropType<Badge>, required: true },
});

const assetInfo = ref<algosdk.modelsv2.Asset>();
const image = ref();

onMounted(async () => {
  assetInfo.value = await getAssetInfo(props.badge.index);
  image.value = ipfs2http(props.badge.image);
});

async function claim() {
  try {
    if (!store.account) throw Error("Invalid Account");
    store.overlay = true;
    const assetId = Number(props.badge.index);
    if (!props.badge) throw Error("Badge not found");
    const sender = { addr: store.account.address, signer: transactionSigner };
    const appClient = new LuteGovClient(
      { sender, resolveBy: "id", id: props.badge.properties.appId },
      Algo.algod
    );
    const composer = appClient.compose();
    const suggestedParams = await Algo.algod.getTransactionParams().do();
    if (!store.account.assets?.some((a) => Number(a.assetId) === assetId)) {
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        assetIndex: assetId,
        receiver: sender.addr,
        sender: sender.addr,
        suggestedParams,
        amount: 0,
      });
      composer.addTransaction({ txn, signer: transactionSigner });
    }
    const leaf = Buffer.from(algosdk.decodeAddress(sender.addr).publicKey);
    const leaves = props.badge.addrs.map(
      (x) => algosdk.decodeAddress(x).publicKey
    );
    const proofArr = new MerkleTree(leaves, sha256).getProof(leaf);
    const proof = proofArr.map((p) => p.data);
    const isLeft = proofArr.map((p) => p.position === "left");
    const fee = (Math.floor(proofArr.length / 9) * 1000 + 2000).microAlgos();
    if (!assetInfo.value) throw Error("Invalid Asset");
    const clawback = assetInfo.value.params.clawback;
    if (!clawback) throw Error("Invalid Clawback");
    composer.claim({ assetId, proof, isLeft }, { sendParams: { fee } });
    const atc = await populateAppCallResources(
      await composer.atc(),
      Algo.algod
    );
    await execAtc(atc, "Successfully Claimed Badge");
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
}
</script>
