import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { network } from "hardhat";
import {
  isAddressEqual,
  namehash,
  parseEventLogs,
  zeroAddress,
  zeroHash,
} from "viem";

import { installMockENS, reverseNode, setResolver } from "../helpers/ens.js";

describe("WithENSBound1155", async function () {
  const { viem } = await network.connect();
  const [deployer, walletA, walletB, walletC, walletD, walletE] =
    await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const aliceNode = namehash("alice.eth");
  const bobNode = namehash("bob.eth");
  const driftNode = namehash("drift.eth");
  const orphanNode = namehash("orphan.eth");

  let mockResolver: Awaited<
    ReturnType<typeof viem.deployContract<"MockENSResolver">>
  >;
  let contract: Awaited<
    ReturnType<typeof viem.deployContract<"WithENSBound1155Example">>
  >;

  before(async function () {
    const installed = await installMockENS({ viem, deployer, publicClient });
    mockResolver = installed.resolver;

    await Promise.all([
      ...[aliceNode, bobNode, driftNode].map((node) =>
        setResolver(deployer, node, mockResolver.address),
      ),
      ...[walletA, walletB, walletC, walletD].map((w) =>
        setResolver(deployer, reverseNode(w.account.address), mockResolver.address),
      ),
      mockResolver.write.setAddr([aliceNode, walletA.account.address]),
      mockResolver.write.setAddr([bobNode, walletB.account.address]),
      mockResolver.write.setAddr([driftNode, walletC.account.address]),
      mockResolver.write.setName([reverseNode(walletA.account.address), "alice.eth"]),
      mockResolver.write.setName([reverseNode(walletB.account.address), "bob.eth"]),
      mockResolver.write.setName([reverseNode(walletC.account.address), "drift.eth"]),
      mockResolver.write.setName([reverseNode(walletD.account.address), "drift.eth"]),
    ]);
  });

  beforeEach(async function () {
    contract = await viem.deployContract("WithENSBound1155Example", []);
  });

  async function transferSingleLogs(txHash: `0x${string}`) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    return parseEventLogs({
      abi: contract.abi,
      logs: receipt.logs,
      eventName: "TransferSingle",
    });
  }

  describe("ENS-bound mint", function () {
    it("Should credit balanceOfByName and balanceOf for the resolved holder", async function () {
      await contract.write.mintToName([1n, 3n, aliceNode]);

      assert.equal(await contract.read.balanceOfByName([1n, aliceNode]), 3n);
      assert.equal(
        await contract.read.balanceOf([walletA.account.address, 1n]),
        3n,
      );
      assert.equal(
        await contract.read.balanceOf([walletB.account.address, 1n]),
        0n,
      );
    });

    it("Should support multiple namehashes for the same id", async function () {
      await contract.write.mintToName([1n, 2n, aliceNode]);
      await contract.write.mintToName([1n, 5n, bobNode]);

      assert.equal(await contract.read.balanceOfByName([1n, aliceNode]), 2n);
      assert.equal(await contract.read.balanceOfByName([1n, bobNode]), 5n);
      assert.equal(
        await contract.read.balanceOf([walletA.account.address, 1n]),
        2n,
      );
      assert.equal(
        await contract.read.balanceOf([walletB.account.address, 1n]),
        5n,
      );
    });

    it("Should reflect resolver changes in subsequent balanceOf calls", async function () {
      await contract.write.mintToName([1n, 4n, driftNode]);
      assert.equal(
        await contract.read.balanceOf([walletC.account.address, 1n]),
        4n,
      );

      await mockResolver.write.setAddr([driftNode, walletD.account.address]);

      assert.equal(
        await contract.read.balanceOf([walletC.account.address, 1n]),
        0n,
      );
      assert.equal(
        await contract.read.balanceOf([walletD.account.address, 1n]),
        4n,
      );

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should revert strict mintToName for an unresolvable name", async function () {
      await assert.rejects(
        contract.write.mintToName([1n, 1n, orphanNode]),
        /UnresolvedName/,
      );
    });

    it("Should revert when binding to the zero namehash", async function () {
      await assert.rejects(
        contract.write.mintToName([1n, 1n, zeroHash]),
        /InvalidBinding/,
      );
    });

    it("Should align OZ balance before topping up an already-drifted binding", async function () {
      await contract.write.mintToName([7n, 10n, driftNode]);
      await mockResolver.write.setAddr([driftNode, walletD.account.address]);

      // Top up with more tokens to the same binding; align should move the prior 10
      // from walletC to walletD via a corrective TransferSingle, then mint 3 more.
      const logs = await transferSingleLogs(
        await contract.write.mintToName([7n, 3n, driftNode]),
      );

      assert.equal(logs.length, 2);
      assert.ok(isAddressEqual(logs[0].args.from, walletC.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, walletD.account.address));
      assert.equal(logs[0].args.value, 10n);
      assert.ok(isAddressEqual(logs[1].args.from, zeroAddress));
      assert.ok(isAddressEqual(logs[1].args.to, walletD.account.address));
      assert.equal(logs[1].args.value, 3n);

      assert.equal(await contract.read.balanceOfByName([7n, driftNode]), 13n);
      assert.equal(
        await contract.read.balanceOf([walletD.account.address, 7n]),
        13n,
      );

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });
  });

  describe("address-bound mint", function () {
    it("Should credit _addressBoundBalance directly", async function () {
      await contract.write.mintToAddress([2n, 5n, walletE.account.address]);

      assert.equal(
        await contract.read.balanceOf([walletE.account.address, 2n]),
        5n,
      );
      assert.equal(await contract.read.balanceOfByName([2n, zeroHash]), 0n);
    });

    it("Should revert when minting to the zero address", async function () {
      await assert.rejects(
        contract.write.mintToAddress([1n, 1n, zeroAddress]),
        /InvalidBinding/,
      );
    });
  });

  describe("hybrid balanceOf", function () {
    it("Should sum address-bound and ENS-bound holdings", async function () {
      await contract.write.mintToName([1n, 2n, aliceNode]);
      await contract.write.mintToAddress([1n, 3n, walletA.account.address]);

      assert.equal(
        await contract.read.balanceOf([walletA.account.address, 1n]),
        5n,
      );
    });

    it("Should ignore ENS holdings when reverse record doesn't verify", async function () {
      await mockResolver.write.setName([
        reverseNode(walletB.account.address),
        "alice.eth",
      ]);

      await contract.write.mintToName([1n, 7n, aliceNode]);

      assert.equal(
        await contract.read.balanceOf([walletB.account.address, 1n]),
        0n,
      );

      await mockResolver.write.setName([
        reverseNode(walletB.account.address),
        "bob.eth",
      ]);
    });
  });

  describe("soulbound enforcement", function () {
    it("Should revert safeTransferFrom", async function () {
      await contract.write.mintToName([1n, 1n, aliceNode]);
      await assert.rejects(
        contract.write.safeTransferFrom(
          [walletA.account.address, walletB.account.address, 1n, 1n, "0x"],
          { account: walletA.account },
        ),
        /Soulbound/,
      );
    });

    it("Should revert safeBatchTransferFrom", async function () {
      await contract.write.mintToAddress([1n, 1n, walletA.account.address]);
      await assert.rejects(
        contract.write.safeBatchTransferFrom(
          [walletA.account.address, walletB.account.address, [1n], [1n], "0x"],
          { account: walletA.account },
        ),
        /Soulbound/,
      );
    });

    it("Should revert setApprovalForAll", async function () {
      await assert.rejects(
        contract.write.setApprovalForAll([walletB.account.address, true], {
          account: walletA.account,
        }),
        /Soulbound/,
      );
    });
  });

  describe("syncHolder", function () {
    it("Should emit TransferSingle(last, current) when the resolution drifts", async function () {
      await contract.write.mintToName([1n, 3n, driftNode]);
      await mockResolver.write.setAddr([driftNode, walletD.account.address]);

      const logs = await transferSingleLogs(
        await contract.write.syncHolder([1n, driftNode]),
      );

      assert.equal(logs.length, 1);
      assert.ok(isAddressEqual(logs[0].args.from, walletC.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, walletD.account.address));
      assert.equal(logs[0].args.value, 3n);
      assert.ok(
        isAddressEqual(
          await contract.read.lastHolderOf([1n, driftNode]),
          walletD.account.address,
        ),
      );

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should not emit when the resolution is unchanged", async function () {
      await contract.write.mintToName([1n, 3n, aliceNode]);

      const logs = await transferSingleLogs(
        await contract.write.syncHolder([1n, aliceNode]),
      );

      assert.equal(logs.length, 0);
    });

    it("Should revert when the name is unresolvable", async function () {
      await assert.rejects(
        contract.write.syncHolder([1n, orphanNode]),
        /UnresolvedName/,
      );
    });
  });

  describe("burn", function () {
    it("Should burn ENS-bound and decrement balanceOfByName", async function () {
      await contract.write.mintToName([1n, 5n, aliceNode]);

      const logs = await transferSingleLogs(
        await contract.write.burnFromName([1n, 2n, aliceNode]),
      );

      assert.equal(logs.length, 1);
      assert.ok(isAddressEqual(logs[0].args.from, walletA.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, zeroAddress));
      assert.equal(logs[0].args.value, 2n);
      assert.equal(await contract.read.balanceOfByName([1n, aliceNode]), 3n);
      assert.equal(
        await contract.read.balanceOf([walletA.account.address, 1n]),
        3n,
      );
    });

    it("Should emit a corrective TransferSingle before burn when drifted", async function () {
      await contract.write.mintToName([1n, 8n, driftNode]);
      await mockResolver.write.setAddr([driftNode, walletD.account.address]);

      const logs = await transferSingleLogs(
        await contract.write.burnFromName([1n, 3n, driftNode]),
      );

      assert.equal(logs.length, 2);
      assert.ok(isAddressEqual(logs[0].args.from, walletC.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, walletD.account.address));
      assert.equal(logs[0].args.value, 8n);
      assert.ok(isAddressEqual(logs[1].args.from, walletD.account.address));
      assert.ok(isAddressEqual(logs[1].args.to, zeroAddress));
      assert.equal(logs[1].args.value, 3n);

      assert.equal(await contract.read.balanceOfByName([1n, driftNode]), 5n);

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should burn address-bound and decrement _addressBoundBalance", async function () {
      await contract.write.mintToAddress([9n, 4n, walletA.account.address]);

      await contract.write.burnFromAddress([walletA.account.address, 9n, 1n]);

      assert.equal(
        await contract.read.balanceOf([walletA.account.address, 9n]),
        3n,
      );
    });

    it("Should revert burnFromName when the name is unresolvable", async function () {
      await contract.write.mintToName([1n, 1n, driftNode]);
      await setResolver(deployer, driftNode, zeroAddress);

      await assert.rejects(
        contract.write.burnFromName([1n, 1n, driftNode]),
        /UnresolvedName/,
      );

      await setResolver(deployer, driftNode, mockResolver.address);
    });

    // Regression: when a holder has both address-bound and ENS-bound balance of the same
    // id, OZ's internal balance is the sum. Without checked arithmetic, a caller could
    // burn more than a single segment (e.g. 7 via burnFromAddress when only 5 are
    // address-bound) and silently underflow our per-segment tracker.
    it("Should revert burnFromAddress when the address-bound portion is insufficient", async function () {
      await contract.write.mintToAddress([1n, 5n, walletA.account.address]);
      await contract.write.mintToName([1n, 3n, aliceNode]);

      await assert.rejects(
        contract.write.burnFromAddress([walletA.account.address, 1n, 7n]),
        /Panic|0x11/,
      );
    });

    it("Should revert burnFromName when the name-bound portion is insufficient", async function () {
      await contract.write.mintToAddress([1n, 5n, walletA.account.address]);
      await contract.write.mintToName([1n, 3n, aliceNode]);

      await assert.rejects(
        contract.write.burnFromName([1n, 7n, aliceNode]),
        /Panic|0x11/,
      );
    });
  });

  describe("CCIP-Read fallback", function () {
    const ccipNode = namehash("ccip.eth");

    before(async function () {
      await setResolver(deployer, ccipNode, mockResolver.address);
      await mockResolver.write.setOffchain([ccipNode, true]);
    });

    it("Should revert strict mintToName when the resolver reverts", async function () {
      await assert.rejects(
        contract.write.mintToName([1n, 1n, ccipNode]),
        /UnresolvedName/,
      );
    });

    it("Should fall back to address-bound when fallbackTo is provided", async function () {
      await contract.write.mintToNameOrFallback([
        1n,
        2n,
        ccipNode,
        walletE.account.address,
      ]);

      assert.equal(
        await contract.read.balanceOf([walletE.account.address, 1n]),
        2n,
      );
      assert.equal(await contract.read.balanceOfByName([1n, ccipNode]), 0n);
    });

    it("Should still mint ENS-bound when the name is resolvable", async function () {
      await contract.write.mintToNameOrFallback([
        1n,
        3n,
        aliceNode,
        walletE.account.address,
      ]);

      assert.equal(await contract.read.balanceOfByName([1n, aliceNode]), 3n);
      assert.equal(
        await contract.read.balanceOf([walletA.account.address, 1n]),
        3n,
      );
    });

    it("Should revert when resolution fails and fallbackTo is zero", async function () {
      await assert.rejects(
        contract.write.mintToNameOrFallback([1n, 1n, ccipNode, zeroAddress]),
        /UnresolvedName/,
      );
    });
  });
});
