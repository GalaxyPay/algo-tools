import {
  mdiCircleMultipleOutline,
  mdiFire,
  mdiHandshake,
  mdiLogout,
  mdiMirror,
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

  if (store.network.inboxRouter || store.network.name === "LocalNet")
    val.push({
      title: "Inbox",
      subtitle: "View and claim assets sent to your inbox.",
      icon: mdiTrayArrowDown,
      path: "/inbox",
    });

  val.push(
    {
      title: "Participation Keys",
      subtitle: "For node runners. Manage participation keys.",
      icon: mdiHandshake,
      path: "/keyreg",
    },
    {
      title: "Opt-Out",
      subtitle:
        "Manage your minimum balance by opting out of assets and applications (smart contracts).",
      icon: mdiLogout,
      path: "/optout",
    },
    {
      title: "Burn Assets",
      subtitle: "Burn ASAs or NFTs. Trustlessly. Permenantly.",
      icon: mdiFire,
      path: "/burn",
    }
  );

  if (store.network.vanityId)
    val.push({
      title: "Vanity Marketplace",
      subtitle: "Buy and sell vanity addresses.",
      icon: mdiMirror,
      path: "/vanity",
    });

  return val;
};
