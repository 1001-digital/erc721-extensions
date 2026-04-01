import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { network } from "hardhat";
import { namehash, parseAbi } from "viem";

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const ADDR_EMPTY_NAME = "0x0000000000000000000000000000000000000042";
const ADDR_NO_RESOLVER = "0x0000000000000000000000000000000000000099";

describe("WithENSReverseLookup", async function () {
  const { viem } = await network.connect();
  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const contract = await viem.deployContract("WithENSReverseLookupExample", []);

  function reverseNode(addr: string) {
    return namehash(`${addr.slice(2).toLowerCase()}.addr.reverse`);
  }

  describe("shortHex", function () {
    it("Should format with uppercase and ellipsis", async function () {
      const result = await contract.read.shortHex([wallet.account.address]);

      const addr = wallet.account.address.toLowerCase().slice(2);
      assert.equal(
        result,
        `0x${addr.slice(0, 4).toUpperCase()}...${addr.slice(-4).toUpperCase()}`,
      );
    });

    it("Should format zero address", async function () {
      const result = await contract.read.shortHex([
        "0x0000000000000000000000000000000000000000",
      ]);
      assert.equal(result, "0x0000...0000");
    });
  });

  describe("displayName", function () {
    it("Should fall back when no ENS registry exists", async function () {
      const display = await contract.read.displayName([wallet.account.address]);
      const short = await contract.read.shortHex([wallet.account.address]);
      assert.equal(display, short);
    });

    describe("with ENS registry", function () {
      const registryAbi = parseAbi([
        "function setResolver(bytes32 node, address resolver) external",
      ]);

      before(async function () {
        const [mockRegistry, mockResolver] = await Promise.all([
          viem.deployContract("MockENSRegistry", []),
          viem.deployContract("MockENSResolver", []),
        ]);

        const registryCode = await publicClient.getCode({
          address: mockRegistry.address,
        });
        await wallet.request({
          method: "hardhat_setCode" as any,
          params: [ENS_REGISTRY, registryCode],
        } as any);

        const walletNode = reverseNode(wallet.account.address);
        await wallet.writeContract({
          address: ENS_REGISTRY,
          abi: registryAbi,
          functionName: "setResolver",
          args: [walletNode, mockResolver.address],
        });

        // Resolver exists but no name set
        const emptyNode = reverseNode(ADDR_EMPTY_NAME);
        await Promise.all([
          mockResolver.write.setName([walletNode, "test.eth"]),
          wallet.writeContract({
            address: ENS_REGISTRY,
            abi: registryAbi,
            functionName: "setResolver",
            args: [emptyNode, mockResolver.address],
          }),
        ]);
      });

      it("Should resolve ENS name when available", async function () {
        const display = await contract.read.displayName([
          wallet.account.address,
        ]);
        assert.equal(display, "test.eth");
      });

      for (const { label, addr } of [
        { label: "resolver returns empty name", addr: ADDR_EMPTY_NAME },
        { label: "no resolver is set", addr: ADDR_NO_RESOLVER },
      ]) {
        it(`Should fall back when ${label}`, async function () {
          const display = await contract.read.displayName([addr]);
          const short = await contract.read.shortHex([addr]);
          assert.equal(display, short);
        });
      }
    });
  });
});
