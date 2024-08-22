import { Badge } from "@/types";
import { fetchAsync, ipfs2http } from ".";
import { getAssetInfo } from "./assetInfo";

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

interface BadgeAsset {
  period: number;
  shrimp: number;
  fish: number;
  dolphin: number;
  shark: number;
  whale: number;
}

export async function getBadges() {
  const store = useAppStore();
  if (!store.account) throw Error("Invalid Account");
  const assets: number[] = [];
  const badges: Badge[] = [];
  const badgeAssets = (await fetchAsync(
    LUTE_DATA + "/badges/assets.v2.json"
  )) as BadgeAsset[];
  // governance period loop
  await Promise.all(
    badgeAssets.map(async (ba) => {
      const governor = await getGov(
        `governance-period-${ba.period}`,
        store.account!.address
      );
      if (governor?.is_eligible) {
        const tier = getTier(
          Number(governor.committed_algo_amount) +
            Number(governor.committed_assets_amount_in_algo)
        );
        if (tier) {
          if (
            !store.account?.assets?.some(
              (a) => a.amount && Number(a.assetId) === ba[tier]
            )
          )
            assets.push(ba[tier]);
        }
      }
    })
  );
  await Promise.all(
    assets.map(async (id) => {
      let assetInfo = await getAssetInfo(id);
      if (!assetInfo) throw Error("Invalid Badge Asset");
      if (!assetInfo.params.url) throw Error("Invalid Badge URL");
      const arc3 = await getIpfsJson(assetInfo.params.url);
      const badge = { ...assetInfo, ...arc3 };
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
