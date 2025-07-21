<script lang="ts" setup>
import { vanityAbi } from "@/data";
import Algo from "@/services/Algo";
import { delay, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, { indexerModels } from "algosdk";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();

const showVanitySell = ref(false);
const showVanityMnemonic = ref(false);
const mnemonic = ref("");

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
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await algodClient.value.getTransactionParams().do();
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
    await execAtc(atc, algodClient.value, "Account Purchased");
    mnemonic.value = algosdk.secretKeyToMnemonic(item.vanity.key.sk);
    showVanityMnemonic.value = true;
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
  getForSale();
}

async function rescind(item: ForSale) {
  try {
    if (!store.network.vanityId) throw Error("Network not supported");
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await algodClient.value.getTransactionParams().do();
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
    await execAtc(atc, algodClient.value, "Account Unlisted");
    await delay(4000);
    store.refresh++;
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
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
    toast.error(err.message, { duration: 7000 });
  }
  loading.value = false;
}

watch(
  () => store.refresh,
  () => getForSale(),
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col gap-4 p-4 pt-0">
    <Card class="px-4 py-2 bg-muted/50">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Instructions</AccordionTrigger>
          <AccordionContent class="p-4">
            <div class="font-bold">Buyers</div>
            <ul class="list-disc pl-4 py-4">
              <li>
                Vanity accounts purchased from here will be rekeyed to your
                account. If you are not comfortable with using rekeyed accounts,
                <a
                  href="https://dev.algorand.co/concepts/accounts/rekeying"
                  target="_blank"
                  class="underline text-blue-600 hover:text-blue-800 visited:text-purple-600"
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
            <div class="font-bold">Sellers</div>
            <ul class="list-disc pl-4 py-4">
              <li>
                In order to sell an account, you must provide the mnemonic so
                that it can be provided to the buyer.
              </li>
              <li>
                You pick the price. A 5% fee is collected in escrow when
                listing. If you remove the listing the fee is refunded.
              </li>
              <li>
                When listing an account, it is rekeyed to the contract and must
                have a minimum balance of .3285 Algo to opt-in to the contract.
                If you remove the listing, the account is rekeyed to you.
              </li>
              <li>
                The account to be listed must be in your wallet and among the
                accounts selected when connecting.
              </li>
            </ul>
            <div class="font-bold">Technical Details</div>
            <ul class="list-disc pl-4 py-4">
              <li>
                All the logic is contained in JavaScript and a smart contract -
                there is no backend server.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
    <Card class="bg-muted/50">
      <CardHeader class="flex items-center">
        <CardTitle>Vanity Marketplace</CardTitle>
        <Button
          variant="secondary"
          :disabled="!activeAddress"
          @click="showVanitySell = true"
          class="ml-auto"
        >
          Add Listing
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Price</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody v-if="loading || forSale?.length">
            <TableRow v-for="item in forSale" :key="item.address">
              <TableCell class="font-mono">
                {{ item.address }}
              </TableCell>
              <TableCell>
                {{ Number(item.vanity?.price) / 10 ** 6 }}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="secondary"
                  :disabled="!activeAddress"
                  @click="
                    item.vanity?.owner === activeAddress
                      ? rescind(item)
                      : buy(item)
                  "
                >
                  {{ item.vanity?.owner === activeAddress ? "Remove" : "Buy" }}
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow class="text-center italic">
              <TableCell colSpan="3">No accounts currently listed</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
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
</template>
