import { namehash, parseAbi, type Hex } from "viem";

export const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

export const registryAbi = parseAbi([
  "function setResolver(bytes32 node, address resolver) external",
  "function resolver(bytes32 node) view returns (address)",
]);

export function reverseNode(addr: string) {
  return namehash(`${addr.slice(2).toLowerCase()}.addr.reverse`);
}

type Viem = { deployContract: (name: string, args?: unknown[]) => Promise<any> };
type Wallet = { request: (args: any) => Promise<any>; writeContract: (args: any) => Promise<Hex> };
type PublicClient = { getCode: (args: { address: Hex }) => Promise<Hex | undefined> };

/// Deploy mock ENS contracts and inject the registry bytecode at the canonical
/// `ENS_REGISTRY` address so the production constants resolve in tests.
export async function installMockENS({
  viem,
  deployer,
  publicClient,
}: {
  viem: Viem;
  deployer: Wallet;
  publicClient: PublicClient;
}) {
  const [mockRegistry, resolver] = await Promise.all([
    viem.deployContract("MockENSRegistry", []),
    viem.deployContract("MockENSResolver", []),
  ]);
  const code = await publicClient.getCode({ address: mockRegistry.address });
  await deployer.request({
    method: "hardhat_setCode",
    params: [ENS_REGISTRY, code],
  });
  return { resolver };
}

export function setResolver(deployer: Wallet, node: Hex, resolver: Hex) {
  return deployer.writeContract({
    address: ENS_REGISTRY,
    abi: registryAbi,
    functionName: "setResolver",
    args: [node, resolver],
  });
}
