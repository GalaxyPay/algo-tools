import networks from "./networks.json";
import { useTools } from "./tools";
export { vanityAbi } from "./vanityAbi";

const nids = networks.filter((n) => n.networkId).map((n) => n.networkId);

export { networks, nids, useTools };
