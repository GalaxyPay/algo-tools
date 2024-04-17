import Algo from "@/services/Algo";
import { modelsv2 } from "algosdk";
import { createStore, get, set } from "idb-keyval";

export async function getAssetInfo(
  id: number | bigint,
  getImage: boolean = false
) {
  try {
    const customStore = createStore("assets", "keyval");
    const numId = Number(id);
    let assetInfo: modelsv2.Asset | undefined = await get(numId, customStore);

    if (
      !assetInfo ||
      (assetInfo.params.url?.startsWith("template-ipfs") && getImage)
    ) {
      const asset = await Algo.algod.getAssetByID(numId).do();
      assetInfo = modelsv2.Asset.from_obj_for_encoding(asset);
      await set(numId, assetInfo, customStore);
    }

    return assetInfo;
  } catch (err: any) {
    console.error(err);
  }
}
