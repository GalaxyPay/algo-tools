<template>
  <v-container>
    <v-card class="mb-3">
      <v-card-title class="d-flex" @click="showInstuctions = !showInstuctions">
        Instructions
        <v-spacer />
        <v-icon>
          {{ showInstuctions ? mdiChevronUp : mdiChevronDown }}
        </v-icon>
      </v-card-title>
      <v-container v-show="showInstuctions">
        Buyers
        <ul class="pa-6">
          <li>
            Vanity accounts purchased from here will be rekeyed to your account.
            If you are not comfortable with using rekeyed accounts,
            <a
              href="https://developer.algorand.org/docs/get-details/accounts/rekey/"
              target="_blank"
              >read up</a
            >
            before using.
          </li>
          <li>
            Some wallets require you to import the rekeyed account using the
            mnemonic. So when you purchase an account, the mnemonic will be
            shown to you. No, this is not secure... but it doesn't matter
            because the account is rekeyed.
          </li>
          <li>
            Never rekey the vanity account back to itself - its key is not
            secure!
          </li>
        </ul>
        Sellers
        <ul class="pa-6">
          <li>
            In order to sell an account, you must provide the mnemonic so that
            it can be provided to the buyer.
          </li>
          <li>
            You pick the price. A 5% fee is collected in escrow when listing. If
            you remove the listing the fee is refunded.
          </li>
          <li>
            When listing an account, it is rekeyed to the contract and must have
            a minimum balance of .3285 Algo to opt-in to the contract. If you
            remove the listing, the account is rekeyed to you.
          </li>
          <li>
            The account to be listed must be in your wallet and among the
            accounts selected when connecting.
          </li>
        </ul>
        Technical Details
        <ul class="pa-6">
          <li>
            All the logic is contained in JavaScript and a smart contract -
            there is no backend server.
          </li>
        </ul>
      </v-container>
    </v-card>
    <v-card>
      <v-card-title class="d-flex">
        Vanity Marketplace
        <v-spacer />
        <v-btn
          text="Add Listing"
          :disabled="!activeAddress"
          @click="showVanitySell = true"
        />
      </v-card-title>
      <v-container>
        <v-row justify="center">
          <v-col cols="10" sm="6">
            <v-text-field
              v-model="filter"
              label="Filter"
              single-line
              hide-details
              density="compact"
              clearable
            />
          </v-col>
        </v-row>
      </v-container>
      <v-container>
        <v-data-table
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="forSale"
          :search="filter"
          density="comfortable"
          :loading="loading"
        >
          <template #[`item.address`]="{ value }">
            <div style="font-family: monospace">
              {{ smAndUp ? value : value.substring(0, 10) + "..." }}
            </div>
          </template>
          <template #[`item.vanity.price`]="{ value }">
            {{ value / 10 ** 6 }}
          </template>
          <template #[`item.action`]="{ item }">
            <v-btn
              :text="item.vanity?.owner === activeAddress ? 'Remove' : 'Buy'"
              :disabled="!activeAddress"
              size="small"
              @click="
                item.vanity?.owner === activeAddress ? rescind(item) : buy(item)
              "
            />
          </template>
          <template #no-data>
            <i>No accounts currently listed</i>
          </template>
        </v-data-table>
      </v-container>
      <VanitySell
        :visible="showVanitySell"
        @close="
          showVanitySell = false;
          getForSale();
        "
      />
      <VanityMnemonic
        :visible="showVanityMnemonic"
        :mnemonic="mnemonic"
        @close="
          showVanityMnemonic = false;
          mnemonic = '';
        "
      />
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
import { vanityAbi } from "@/data";
import Algo, { getParams } from "@/services/Algo";
import { delay, execAtc } from "@/utils";
import { mdiChevronDown, mdiChevronUp } from "@mdi/js";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { indexerModels } from "algosdk";
import { useDisplay } from "vuetify";

const store = useAppStore();
const { smAndUp } = useDisplay();
const { activeAddress, transactionSigner } = useWallet();

const showInstuctions = ref(true);
const showVanitySell = ref(false);
const showVanityMnemonic = ref(false);
const mnemonic = ref("");
const headers = ref([
  { title: "Address", key: "address" },
  { title: "Price", key: "vanity.price" },
  { title: "Action", key: "action" },
]);
const itemsPerPage = ref(10);
const filter = ref();

interface ForSale extends indexerModels.Account {
  vanity?: {
    owner: string;
    price: number;
    key: algosdk.Account;
  };
}

async function buy(item: ForSale) {
  try {
    if (!item.vanity) throw Error("Invalid Item");
    if (!store.network.vanityId) throw Error("Network not supported");
    store.overlay = true;
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await getParams();
    const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: activeAddress.value!,
      suggestedParams,
      receiver: item.vanity.owner,
      amount: item.vanity.price,
    });
    const txnWithSigner = { txn: payTxn, signer: transactionSigner };
    suggestedParams.fee = suggestedParams.minFee * 2n;
    suggestedParams.flatFee = true;
    const method = vanityAbi.methods.find((m) => m.name == "purchase");
    if (!method) throw Error("Invalid Method");
    atc.addMethodCall({
      appID: store.network.vanityId,
      sender: activeAddress.value!,
      method,
      methodArgs: [txnWithSigner, item.address],
      suggestedParams,
      appAccounts: [item.address],
      signer: transactionSigner,
    });
    await execAtc(atc, "Successfully Purchased Account");
    mnemonic.value = algosdk.secretKeyToMnemonic(item.vanity.key.sk);
    showVanityMnemonic.value = true;
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
  getForSale();
}

async function rescind(item: ForSale) {
  try {
    if (!store.network.vanityId) throw Error("Network not supported");
    store.overlay = true;
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await getParams();
    suggestedParams.fee = suggestedParams.minFee * 3n;
    suggestedParams.flatFee = true;
    const method = vanityAbi.methods.find((m) => m.name == "rescind");
    if (!method) throw Error("Invalid Method");
    atc.addMethodCall({
      appID: store.network.vanityId,
      sender: activeAddress.value!,
      method,
      methodArgs: [item.address],
      suggestedParams,
      appAccounts: [item.address],
      signer: transactionSigner,
    });
    await execAtc(atc, "Successfully Unlisted Account");
    await delay(4000);
    store.refresh++;
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  store.overlay = false;
  getForSale();
}

const forSale = ref<ForSale[]>();
const loading = ref();
async function getForSale() {
  try {
    if (!store.network.vanityId) throw Error("Network not supported");
    loading.value = true;
    const appAddr = algosdk.getApplicationAddress(store.network.vanityId);
    const { accounts } = await Algo.indexer
      .searchAccounts()
      .authAddr(appAddr)
      .do();
    const mapVanity: ForSale[] = accounts.map((a) => {
      const kv = a.appsLocalState?.find(
        (s) => Number(s.id) === store.network.vanityId
      )?.keyValue;
      if (!kv) return a;
      const fs: ForSale = a;
      fs.vanity = {
        owner: algosdk.encodeAddress(
          kv.find((kv) => Buffer.from(kv.key).toString() === "owner")!.value
            .bytes
        ),
        price: Number(
          kv.find((kv) => Buffer.from(kv.key).toString() === "price")!.value
            .uint
        ),
        key: algosdk.mnemonicToSecretKey(
          algosdk.secretKeyToMnemonic(
            kv.find((kv) => Buffer.from(kv.key).toString() === "key")!.value
              .bytes
          )
        ),
      };
      return fs;
    });
    forSale.value = mapVanity.filter(
      (a) => a.address === a.vanity?.key.addr.toString()
    );
  } catch (err: any) {
    console.error(err);
    store.setSnackbar(err.message, "error");
  }
  loading.value = false;
}

watch(
  () => store.refresh,
  () => getForSale(),
  { immediate: true }
);
</script>
