import LuteLogo from "@/components/svg/LuteLogo.vue";
import {
  mdiCircleMultipleOutline,
  mdiFire,
  mdiHandshake,
  mdiLogout,
  mdiMirror,
  mdiPencil,
  mdiTrayArrowDown,
} from "@mdi/js";

interface Tool {
  title: string;
  subtitle: string;
  icon: any;
  path: string;
}

export const tools = () => {
  const store = useAppStore();

  const val: Tool[] = [];

  if (store.network.nftIndexer)
    val.push({
      title: "ARC200 Assets",
      subtitle: "View and send contract-based assets",
      icon: mdiCircleMultipleOutline,
      path: "/arc200",
    });

  if (store.network.inboxRouter)
    val.push({
      title: "Inbox",
      subtitle: "View and claim assets sent to your inbox.",
      icon: mdiTrayArrowDown,
      path: "/inbox",
    });

  val.push(
    {
      title: "Opt-Out",
      subtitle:
        "Manage your minimum balance by opting out of assets and applications (smart contracts).",
      icon: mdiLogout,
      path: "/optout",
    },
    {
      title: "Compose Transaction",
      subtitle:
        "Constuct, sign, and send a transaction. Make payments, transfer assets, register participation keys, rekey, and more.",
      icon: mdiPencil,
      path: "/compose",
    },
    {
      title: "Burn Assets",
      subtitle: "Burn ASAs or NFTs. Trustlessly. Permenantly.",
      icon: mdiFire,
      path: "/burn",
    },
    {
      title: "Participation Keys",
      subtitle: "For node runners. Manage participation keys on your node.",
      icon: mdiHandshake,
      path: "/partkey",
    }
  );

  if (store.network.vanityId)
    val.push({
      title: "Vanity Marketplace",
      subtitle: "Buy and sell vanity addresses.",
      icon: mdiMirror,
      path: "/vanity",
    });

  val.push({
    title: "Lute Badges",
    subtitle: "Claim governance badges issued by Lute Wallet.",
    icon: LuteLogo,
    path: "/badge",
  });

  return val;
};
