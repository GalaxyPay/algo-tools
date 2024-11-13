import Algo from "@/services/Algo";
import type { TinyAsset } from "@/types";
import { modelsv2 } from "algosdk";
import { createStore, get, set } from "idb-keyval";

export async function getAssetInfo(
  id: number | bigint,
  getImage: boolean = false
) {
  try {
    let assetInfo: modelsv2.Asset | undefined;
    const appStore = useAppStore();
    let tiny: TinyAsset | undefined;
    if (appStore.network.networkId === "mainnet" || id === 0) {
      tiny = appStore.tinyman?.[Number(id)];
      if (tiny && id === 0) {
        assetInfo = modelsv2.Asset.from_obj_for_encoding({
          index: Number(tiny.id),
          params: {
            creator: "",
            decimals: tiny.decimals,
            name: tiny.name,
            total: tiny.total_amount,
            "unit-name": tiny.unit_name,
            url: tiny.logo.png,
          },
        });
        return assetInfo;
      }
    }
    const storeName: string = "assets-" + appStore.network.networkId;
    const customStore = createStore(storeName, "keyval");
    const numId = Number(id);
    assetInfo = await get(numId, customStore);

    if (
      !assetInfo ||
      (assetInfo.params.url?.startsWith("template-ipfs") && getImage)
    ) {
      const asset = await Algo.algod.getAssetByID(numId).do();
      assetInfo = modelsv2.Asset.from_obj_for_encoding(asset);
      await set(numId, assetInfo, customStore);
    }
    if (tiny) assetInfo.params.url = tiny.logo.png;
    return assetInfo;
  } catch (err: any) {
    console.error(err);
  }
}
