import { Algodv2, Indexer } from "algosdk";

const Algo = {
  get algod() {
    const store = useAppStore();
    return new Algodv2(
      store.network.algod.token,
      store.network.algod.url,
      store.network.algod.port
    );
  },
  get indexer() {
    const store = useAppStore();
    return new Indexer(
      "",
      store.network.indexer.url,
      store.network.indexer.port
    );
  },
};

export async function getParams() {
  return await Algo.algod.getTransactionParams().do();
}

export async function getNetwork(token: string, url: string, port: string) {
  const tempClient = new Algodv2(token, url, port);
  const genesisRaw = await tempClient.genesis().doRaw();
  const genesis = JSON.parse(Buffer.from(genesisRaw).toString());
  return genesis.network as string;
}

export default Algo;
