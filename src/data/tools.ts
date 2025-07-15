import { useNetwork } from "@txnlab/use-wallet-vue";
import {
  CaseUpper,
  Coins,
  Download,
  Flame,
  Handshake,
  LogOut,
} from "lucide-vue-next";
import type { FunctionalComponent } from "vue";
import { networks } from ".";

interface Tool {
  title: string;
  subtitle: string;
  icon: FunctionalComponent;
  path: string;
}

export const tools = () => {
  const { activeNetwork } = useNetwork();
  const network = networks.find((n) => n.networkId === activeNetwork.value);

  const val: Tool[] = [];

  if (network?.nftIndexer)
    val.push({
      title: "ARC200 Assets",
      subtitle: "View and send contract-based assets",
      icon: Coins,
      path: "/arc200",
    });

  if (network?.inboxRouter || network?.name === "LocalNet")
    val.push({
      title: "Asset Inbox",
      subtitle: "View and claim assets sent to your inbox.",
      icon: Download,
      path: "/inbox",
    });

  val.push(
    {
      title: "Participation Keys",
      subtitle: "For node runners. Manage participation keys.",
      icon: Handshake,
      path: "/keyreg",
    },
    {
      title: "Opt-Out",
      subtitle:
        "Manage your minimum balance by opting out of assets and applications (smart contracts).",
      icon: LogOut,
      path: "/optout",
    },
    {
      title: "Burn Assets",
      subtitle: "Burn ASAs or NFTs. Trustlessly. Permenantly.",
      icon: Flame,
      path: "/burn",
    }
  );

  if (network?.vanityId)
    val.push({
      title: "Vanity Marketplace",
      subtitle: "Buy and sell vanity addresses.",
      icon: CaseUpper,
      path: "/vanity",
    });

  return val;
};
