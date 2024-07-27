import networks from "./networks.json";
import { tools } from "./tools";
export { vanityAbi } from "./vanityAbi";

const nids = networks.filter((n) => n.networkId).map((n) => n.networkId);

export { networks, nids, tools };
