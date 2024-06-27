import { Badge } from "@/types";
import { fetchAsync, ipfs2http } from ".";
import { getAssetInfo } from "./assetInfo";
import { modelsv2 } from "algosdk";

async function getGov(slug: string, addr: string) {
  const url = `https://governance.algorand.foundation/api/periods/${slug}/governors/${addr}`;
  return await fetchAsync(url);
}

function getTier(amount: number) {
  const val =
    amount >= 10 ** 11
      ? "whale"
      : amount >= 10 ** 10
      ? "shark"
      : amount >= 10 ** 9
      ? "dolphin"
      : amount >= 10 ** 8
      ? "fish"
      : amount >= 10 ** 7
      ? "shrimp"
      : undefined;
  return val;
}

const LUTE_DATA = "https://data.lute.app/";

export async function getBadges() {
  const store = useAppStore();
  if (!store.account) throw Error("Invalid Account");
  const assets: number[] = [];
  const badges: Badge[] = [];
  const badgeAssets = await fetchAsync(LUTE_DATA + "/badges/assets.json");
  const periods = Object.keys(badgeAssets).length;
  // governance period loop
  for (let i = 1; i <= periods; i++) {
    const governor = await getGov(
      `governance-period-${i}`,
      store.account.address
    );
    if (governor?.is_eligible) {
      const tier = getTier(
        Number(governor.committed_algo_amount) +
          Number(governor.committed_assets_amount_in_algo)
      );
      if (tier) {
        const period = `gov${i}`;
        const assetId = badgeAssets[period][tier];
        if (
          !store.account?.assets?.some((a) => a.amount && a.assetId === assetId)
        )
          assets.push(assetId);
      }
    }
  }
  await Promise.all(
    assets.map(async (id) => {
      const resp = await getAssetInfo(id);
      if (!resp) throw Error("Invalid Badge Asset");
      let badge = modelsv2.Asset.from_obj_for_encoding(resp) as Badge;
      if (!badge.params.url) throw Error("Invalid Badge URL");
      const arc3 = await getIpfsJson(badge.params.url);
      badge = { ...badge, ...arc3 };
      const addrs = await fetchAsync(LUTE_DATA + arc3.properties.addrs);
      badge.addrs = addrs;
      badges.push(badge);
    })
  );
  return badges;
}

async function getIpfsJson(url: string) {
  const httpUrl = ipfs2http(url);
  const addrs = await fetchAsync(httpUrl);
  return addrs;
}
