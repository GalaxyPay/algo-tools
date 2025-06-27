export interface SnackBar {
  text: string;
  color: string;
  timeout: number;
  display: boolean;
}

export interface Network {
  name: string;
  algod: Node;
  indexer: Node;
  networkId: string;
  explorer: string;
  vanityId?: number;
  inboxRouter?: number;
  nftIndexer?: string;
}

export interface Node {
  url: string;
  port: string;
  token: string;
}

export type Address = string;
export type Base64 = string;
export type TxHash = string;

interface Txn {
  sender: Address;
  fee: number;
  firstRound: number;
  lastRound: number;
  genesisID: string;
  genesisHash: Base64;
  note?: Uint8Array | Base64;
  reKeyTo?: Address;
  group?: Uint8Array | Base64;
  flatFee: boolean;
}

interface ConfigTxn extends Txn {
  type: "acfg";
  assetManager?: Address;
  assetReserve?: Address;
  assetFreeze?: Address;
  assetClawback?: Address;
}

interface TransferTxn extends Txn {
  receiver: Address;
  amount: number;
  closeRemainderTo?: Address;
}

export interface PaymentTxn extends TransferTxn {
  type: "pay";
}

export interface AssetTxn extends TransferTxn {
  type: "axfer";
  assetRevocationTarget?: Address;
  assetIndex: number;
}

export interface AssetConfigTxn extends ConfigTxn {
  assetIndex: number;
}

export interface AssetCreateTxn extends ConfigTxn {
  assetTotal?: number;
  assetDecimals?: number;
  assetDefaultFrozen?: boolean;
  assetName?: string;
  assetUnitName?: string;
  assetURL?: string;
  assetMetadataHash?: Uint8Array | Base64;
}

export interface DestroyAssetTxn extends ConfigTxn {
  assetIndex: number;
}

export interface FreezeAssetTxn extends Txn {
  type: "afrz";
  assetIndex: number;
  freezeAccount: Address;
  freezeState: boolean;
}

export interface KeyRegTxn extends Txn {
  type: "keyreg";
  voteKey?: Base64;
  selectionKey?: Base64;
  stateProofKey?: Base64;
  voteFirst?: number;
  voteLast?: number;
  voteKeyDilution?: number;
  nonParticipation?: boolean;
}

export enum OnApplicationComplete {
  NoOpOC = 0,
  OptInOC = 1,
  CloseOutOC = 2,
  ClearStateOC = 3,
  UpdateApplicationOC = 4,
  DeleteApplicationOC = 5,
}

export interface ApplicationTxn extends Txn {
  type: "appl";
  appArgs?: Uint8Array[] | Base64[];
  appAccounts?: Address[];
  appForeignApps?: number[];
  appForeignAssets?: number[];
}

export interface CreateApplTxn extends ApplicationTxn {
  appApprovalProgram: Uint8Array | Base64;
  appClearProgram: Uint8Array | Base64;
  appLocalInts: number;
  appLocalByteSlices: number;
  appGlobalInts: number;
  appGlobalByteSlices: number;
  appOnComplete?: OnApplicationComplete; // Default value is 0
  extraPages?: number;
}

export interface CallApplTxn extends ApplicationTxn {
  appIndex: number;
  appOnComplete: OnApplicationComplete.NoOpOC;
}

export interface OptInApplTxn extends ApplicationTxn {
  appIndex: number;
  appOnComplete: OnApplicationComplete.OptInOC;
}

export interface CloseOutApplTxn extends ApplicationTxn {
  appIndex: number;
  appOnComplete: OnApplicationComplete.CloseOutOC;
}

export interface ClearApplTxn extends ApplicationTxn {
  appIndex: number;
  appOnComplete: OnApplicationComplete.ClearStateOC;
}
export interface UpdateApplTxn extends ApplicationTxn {
  appIndex: number;
  appOnComplete: OnApplicationComplete.UpdateApplicationOC;
  appApprovalProgram: Uint8Array | Base64;
  appClearProgram: Uint8Array | Base64;
}

export interface DeleteApplTxn extends ApplicationTxn {
  appIndex: number;
  appOnComplete: OnApplicationComplete.DeleteApplicationOC;
}

export type ApplTxn =
  | CreateApplTxn
  | CallApplTxn
  | OptInApplTxn
  | CloseOutApplTxn
  | ClearApplTxn
  | UpdateApplTxn;

export type EncodedTransaction = Base64 | Uint8Array;

export type AlgorandTxn =
  | PaymentTxn
  | AssetTxn
  | AssetConfigTxn
  | AssetCreateTxn
  | DestroyAssetTxn
  | FreezeAssetTxn
  | KeyRegTxn
  | ApplTxn;

export interface TinyAsset {
  id: string;
  name: string;
  unit_name: string;
  decimals: number;
  url: string;
  total_amount: string;
  logo: {
    png: string;
    svg: string;
  };
  deleted: boolean;
}
