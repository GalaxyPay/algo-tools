<script lang="ts" setup>
import router from "@/router";
import burnTeal from "@/teal/burn.teal?raw";
import { bigintAmount, execAtc } from "@/utils";
import { useWallet } from "@txnlab/use-wallet-vue";
import algosdk, {
  IntDecoding,
  modelsv2,
  parseJSON,
  stringifyJSON,
} from "algosdk";
import { toast } from "vue-sonner";

const store = useAppStore();
const { algodClient, activeAddress, transactionSigner } = useWallet();

interface BurnAsset extends modelsv2.AssetHolding {
  params?: any;
  title?: string | bigint;
}

const assets = ref<BurnAsset[]>();
const assetId = ref();
// const form = ref();
const amount = ref();
const closeout = ref(false);
const asset = computed(() =>
  assets.value?.find((a) => a.assetId == assetId.value)
);
const clawback = computed(
  () =>
    asset.value?.params.clawback &&
    asset.value?.params.clawback !=
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
);
const opted = computed(() =>
  lsigInfo.value?.assets?.find((a) => a.assetId == assetId.value)
);
const needFunding = computed(
  () =>
    (lsigInfo.value?.amount || 0n) - (lsigInfo.value?.minBalance || 0n) < 101000
);

// const required = (v: number) => closeout.value || !!v || v === 0 || "Required";

async function getAssets() {
  if (!store.account) {
    router.replace("/");
    return;
  }
  const account: modelsv2.Account = parseJSON(stringifyJSON(store.account), {
    intDecoding: IntDecoding.MIXED,
  });

  if (!account) throw Error("Invalid Account");
  if (!account.assets) return;
  const burnAssets: BurnAsset[] = account.assets;
  await Promise.all(
    burnAssets.map(async (x, index: number) => {
      const ca = account.createdAssets?.find((ca) => ca.index == x.assetId);
      let params;
      if (ca) {
        params = ca.params;
      } else {
        try {
          const assetInfo = await algodClient.value
            .getAssetByID(x.assetId)
            .do();
          params = assetInfo.params;
        } catch (err: any) {
          console.error(err);
          params = { creator: account.address };
        }
      }
      burnAssets[index].params = params;
      burnAssets[index].title = params.name || params.unitName || x.assetId;
    })
  );
  assets.value = account.assets;
  if (!asset.value) assetId.value = undefined;
}

const lsig = ref();
const lsigInfo = ref<modelsv2.Account>();

async function getLsig() {
  lsig.value = await algodClient.value.compile(burnTeal).do();
  lsigInfo.value = await algodClient.value
    .accountInformation(lsig.value.hash)
    .do();
}

onMounted(async () => {
  await getAssets();
  await getLsig();
});

async function burn() {
  // const { valid } = await form.value.validate();
  // if (!valid) return;
  try {
    const atc = new algosdk.AtomicTransactionComposer();
    const suggestedParams = await algodClient.value.getTransactionParams().do();

    if (!opted.value && needFunding.value) {
      suggestedParams.flatFee = true;
      suggestedParams.fee = suggestedParams.minFee;

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        receiver: lsig.value.hash,
        sender: activeAddress.value!,
        suggestedParams,
        amount: 100000,
      });
      atc.addTransaction({ txn, signer: transactionSigner });
    }

    if (!opted.value) {
      suggestedParams.flatFee = true;
      suggestedParams.fee = 0n;
      const lsigAcct = new algosdk.LogicSigAccount(
        new Uint8Array(Buffer.from(lsig.value.result, "base64"))
      );
      const lsigSigner = algosdk.makeLogicSigAccountTransactionSigner(lsigAcct);
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: lsig.value.hash,
        receiver: lsig.value.hash,
        suggestedParams,
        assetIndex: assetId.value,
        amount: 0,
      });
      atc.addTransaction({ txn, signer: lsigSigner });
    }

    suggestedParams.flatFee = true;
    suggestedParams.fee = suggestedParams.minFee * 2n;
    if (amount.value || closeout.value) {
      const burnObj: any = {
        sender: activeAddress.value!,
        receiver: lsig.value.hash,
        suggestedParams,
        assetIndex: assetId.value,
        amount: amount.value
          ? bigintAmount(amount.value, asset.value?.params.decimals)
          : 0,
      };
      if (closeout.value) burnObj.closeRemainderTo = lsig.value.hash;
      const txn =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(burnObj);
      atc.addTransaction({ txn, signer: transactionSigner });
    }
    await execAtc(atc, algodClient.value, "Successfully Burned Asset");
    // form.value.reset();
    assetId.value = undefined;
  } catch (err: any) {
    console.error(err);
    toast.error(err.message, { duration: 7000 });
  }
}

watch(
  () => store.refresh,
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await getAssets();
    await getLsig();
  }
);
</script>

<template>
  <div class="flex flex-col gap-4 p-4 pt-0">
    <Card class="bg-muted/50" v-if="store.account">
      <CardHeader>
        <CardTitle>Burn Assets</CardTitle>
        <CardDescription>
          To get started, select an asset from your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="max-w-sm mx-auto">
          <Select v-model="assetId">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  v-for="asset in assets"
                  :key="Number(asset.assetId)"
                  :value="asset.assetId"
                >
                  {{ asset.title }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <div v-show="clawback" class="p-1 text-sm text-yellow-600">
            Assets with clawback enabled cannot be burned.
          </div>
        </div>
        <div v-if="assetId" class="p-4">
          <div class="flex justify-around">
            <div>
              <div class="font-bold py-2">Asset Details</div>
              <div class="text-xs">
                <div>ID: {{ asset?.assetId }}</div>
                <div>Name: {{ asset?.params.name }}</div>
                <div>Unit: {{ asset?.params.unitName }}</div>
                <div>
                  Amount Held:
                  {{
                    Number(asset?.amount) /
                    10 ** Number(asset?.params?.decimals)
                  }}
                </div>
                <div>
                  Clawback:
                  {{ clawback ? "Enabled" : "Disabled" }}
                </div>
                <div v-show="!clawback">
                  Previously Burned:
                  {{
                    (Number(opted?.amount) || 0) /
                    10 ** Number(asset?.params?.decimals)
                  }}
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-2 text-center">
              <Button
                variant="destructive"
                :disabled="clawback"
                @click="burn()"
                class="mx-auto"
              >
                Burn It
              </Button>
              <div v-show="!opted && needFunding" class="text-sm">
                <div>The burn account is not yet opted-in to this asset.</div>
                <div>A payment will be added to cover the .1 MBR increase.</div>
                <div>This only happens once per asset.</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card class="p-4 bg-muted/50" v-if="store.account">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Technical Details</AccordionTrigger>
          <AccordionContent>
            <div class="p-4">
              The burn account is a Logic Signature. This means that the account
              will only approve transactions that satisfy its logic. There is no
              key or mnemonic for this account.
            </div>
            <div class="p-4">
              <pre>{{ lsig?.hash }}</pre>
            </div>
            <div class="p-4">
              The logic is quite short, presented here in TEAL.
            </div>
            <div class="p-4">
              <pre>{{ burnTeal }}</pre>
            </div>
            <div class="p-4">
              Translated, this says that the only transactions it will approve
              are asset transfers to itself (opt-ins) where there is no rekeying
              or closing-out. This account can opt-in to assets and that is all.
              Once assets are sent to this account they are not retrievable
              (burnt).
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  </div>
  <!-- <v-container>

          <v-col v-show="!clawback" align-self="center" class="text-center">
            <v-form ref="form" validate-on="submit" @submit.prevent="burn()">
              <v-row justify="center">
                <v-col cols="10" md="8" lg="7" class="d-flex">
                  <v-text-field
                    v-model.number="amount"
                    type="number"
                    label="Amount to Burn"
                    :disabled="closeout"
                    :rules="[required]"
                  />
                  <v-checkbox
                    v-model="closeout"
                    label="Close Out"
                    @update:model-value="
                      (val: boolean) => {
                        if (val) {
                          amount = undefined;
                          form.validate();
                        }
                      }
                    "
                  />
                </v-col>
              </v-row>
              <v-btn text="Burn It" type="submit" />
              <v-card-text v-show="!opted && needFunding" class="text-caption">
                <div>The burn account is not yet opted-in to this asset.</div>
                <div>A payment will be added to cover the .1 MBR increase.</div>
                <div>This only happens once per asset.</div>
              </v-card-text>
            </v-form>
          </v-col>
          <v-col v-show="clawback">
            <v-card-text>
              Assets with clawback enabled cannot be burned.
            </v-card-text>
          </v-col>
        </v-row>
      </v-container>
    </v-card>
    <v-card class="mt-3">
      <v-card-title class="d-flex" @click="showDetails = !showDetails">
        Technical Details
        <v-spacer />
        <v-icon>
          {{ showDetails ? mdiChevronUp : mdiChevronDown }}
        </v-icon>
      </v-card-title>
      <v-container v-show="showDetails">
        <v-container>
          The burn account is a Logic Signature. This means that the account
          will only approve transactions that satisfy its logic. There is no key
          or mnemonic for this account.
        </v-container>
        <v-container>
          <pre>{{ lsig?.hash }}</pre>
        </v-container>
        <v-container>
          The logic is quite short, presented here in TEAL.
        </v-container>
        <v-container>
          <pre>{{ burnTeal }}</pre>
        </v-container>
        <v-container>
          Translated, this says that the only transactions it will approve are
          asset transfers to itself (opt-ins) where there is no rekeying or
          closing-out. This account can opt-in to assets and that is all. Once
          assets are sent to this account they are not retrievable (burnt).
        </v-container>
      </v-container>
    </v-card>
  </v-container> -->
</template>
