import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { network } from "hardhat";
import {
  isAddressEqual,
  namehash,
  parseEventLogs,
  toBytes,
  toHex,
  zeroAddress,
  zeroHash,
} from "viem";

import { installMockENS, reverseNode, setResolver } from "../helpers/ens.js";

describe("WithENSBound721", async function () {
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
  let namehashContract: Awaited<
    ReturnType<typeof viem.deployContract<"WithENSBound721Example">>
  >;
  let contract: typeof namehashContract;

  before(async function () {
    const installed = await installMockENS({ viem, deployer, publicClient });
    mockResolver = installed.resolver;
    namehashContract = await viem.deployContract(
      "WithENSBound721Example",
      [],
    );

    await Promise.all([
      ...[aliceNode, bobNode, driftNode].map((node) =>
        setResolver(deployer, node, mockResolver.address),
      ),
      ...[walletA, walletB, walletC, walletD].map((w) =>
        setResolver(deployer, reverseNode(w.account.address), mockResolver.address),
      ),
    ]);

    await Promise.all([
      mockResolver.write.setAddr([aliceNode, walletA.account.address]),
      mockResolver.write.setAddr([bobNode, walletB.account.address]),
      mockResolver.write.setAddr([driftNode, walletC.account.address]),
      mockResolver.write.setName([reverseNode(walletA.account.address), "alice.eth"]),
      mockResolver.write.setName([reverseNode(walletB.account.address), "bob.eth"]),
      mockResolver.write.setName([reverseNode(walletC.account.address), "drift.eth"]),
    ]);
    // walletD has no reverse name; configured per-test.
  });

  beforeEach(async function () {
    contract = await viem.deployContract("WithENSBound721Example", []);
  });

  async function transferLogs(txHash: `0x${string}`) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    return parseEventLogs({
      abi: contract.abi,
      logs: receipt.logs,
      eventName: "Transfer",
    });
  }

  describe("namehash", function () {
    it("Should match viem's namehash for a typical name", async function () {
      const result = await namehashContract.read.namehashOf([
        toHex(toBytes("alice.eth")),
      ]);
      assert.equal(result, aliceNode);
    });

    it("Should match viem's namehash for a subdomain", async function () {
      const result = await namehashContract.read.namehashOf([
        toHex(toBytes("vault.alice.eth")),
      ]);
      assert.equal(result, namehash("vault.alice.eth"));
    });
  });

  describe("ENS-bound mint", function () {
    it("Should resolve ownerOf via the bound name", async function () {
      await contract.write.mintToName([1n, aliceNode]);

      assert.ok(
        isAddressEqual(await contract.read.ownerOf([1n]), walletA.account.address),
      );
      assert.equal(await contract.read.nameOf([1n]), aliceNode);
      assert.equal(await contract.read.balanceOfName([aliceNode]), 1n);
    });

    it("Should track balanceOf via the holder's primary name", async function () {
      await contract.write.mintToName([1n, aliceNode]);
      await contract.write.mintToName([2n, aliceNode]);

      assert.equal(await contract.read.balanceOf([walletA.account.address]), 2n);
      assert.equal(await contract.read.balanceOf([walletB.account.address]), 0n);
    });

    it("Should reflect resolver changes in subsequent ownerOf calls", async function () {
      await contract.write.mintToName([1n, driftNode]);
      assert.ok(
        isAddressEqual(await contract.read.ownerOf([1n]), walletC.account.address),
      );

      await mockResolver.write.setAddr([driftNode, walletD.account.address]);
      assert.ok(
        isAddressEqual(await contract.read.ownerOf([1n]), walletD.account.address),
      );

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should revert when binding to an unresolved name", async function () {
      await assert.rejects(
        contract.write.mintToName([1n, orphanNode]),
        /UnresolvedName/,
      );
    });

    it("Should revert when binding to the zero namehash", async function () {
      await assert.rejects(
        contract.write.mintToName([1n, zeroHash]),
        /InvalidBinding/,
      );
    });

    it("Should revert ownerOf if the resolver is later removed", async function () {
      const freshNode = namehash("ephemeral.eth");
      await setResolver(deployer, freshNode, mockResolver.address);
      await mockResolver.write.setAddr([freshNode, walletE.account.address]);

      await contract.write.mintToName([1n, freshNode]);

      await setResolver(deployer, freshNode, zeroAddress);

      await assert.rejects(contract.read.ownerOf([1n]), /UnresolvedName/);
    });
  });

  describe("address-bound mint", function () {
    it("Should fix ownerOf at mint time", async function () {
      await contract.write.mintToAddress([1n, walletE.account.address]);

      assert.ok(
        isAddressEqual(await contract.read.ownerOf([1n]), walletE.account.address),
      );
      assert.equal(await contract.read.nameOf([1n]), zeroHash);
      assert.equal(await contract.read.balanceOf([walletE.account.address]), 1n);
    });

    it("Should revert when binding to the zero address", async function () {
      await assert.rejects(
        contract.write.mintToAddress([1n, zeroAddress]),
        /InvalidBinding/,
      );
    });
  });

  describe("hybrid balanceOf", function () {
    it("Should sum address-bound and ENS-bound holdings", async function () {
      await contract.write.mintToName([1n, aliceNode]);
      await contract.write.mintToAddress([2n, walletA.account.address]);

      assert.equal(await contract.read.balanceOf([walletA.account.address]), 2n);
    });

    it("Should ignore ENS holdings when reverse record doesn't verify", async function () {
      // walletB claims "alice.eth" via reverse record, but alice.eth resolves to walletA.
      await mockResolver.write.setName([
        reverseNode(walletB.account.address),
        "alice.eth",
      ]);

      await contract.write.mintToName([1n, aliceNode]);

      assert.equal(await contract.read.balanceOf([walletB.account.address]), 0n);

      await mockResolver.write.setName([
        reverseNode(walletB.account.address),
        "bob.eth",
      ]);
    });
  });

  describe("soulbound enforcement", function () {
    it("Should revert transferFrom on an ENS-bound token", async function () {
      await contract.write.mintToName([1n, aliceNode]);
      await assert.rejects(
        contract.write.transferFrom(
          [walletA.account.address, walletB.account.address, 1n],
          { account: walletA.account },
        ),
        /Soulbound/,
      );
    });

    it("Should revert transferFrom on an address-bound token", async function () {
      await contract.write.mintToAddress([1n, walletA.account.address]);
      await assert.rejects(
        contract.write.transferFrom(
          [walletA.account.address, walletB.account.address, 1n],
          { account: walletA.account },
        ),
        /Soulbound/,
      );
    });

    it("Should revert approve and setApprovalForAll", async function () {
      await contract.write.mintToName([1n, aliceNode]);
      await assert.rejects(
        contract.write.approve([walletB.account.address, 1n], {
          account: walletA.account,
        }),
        /Soulbound/,
      );
      await assert.rejects(
        contract.write.setApprovalForAll([walletB.account.address, true], {
          account: walletA.account,
        }),
        /Soulbound/,
      );
    });
  });

  describe("syncOwnership", function () {
    it("Should emit Transfer when the resolved address has changed", async function () {
      await contract.write.mintToName([1n, driftNode]);
      await mockResolver.write.setAddr([driftNode, walletD.account.address]);

      const logs = await transferLogs(await contract.write.syncOwnership([1n]));

      assert.equal(logs.length, 1);
      assert.ok(isAddressEqual(logs[0].args.from, walletC.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, walletD.account.address));

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should not emit when the resolved address is unchanged", async function () {
      await contract.write.mintToName([1n, aliceNode]);

      const logs = await transferLogs(await contract.write.syncOwnership([1n]));

      assert.equal(logs.length, 0);
    });
  });

  describe("burn", function () {
    it("Should clear ENS-bound state and decrement balanceOfName", async function () {
      await contract.write.mintToName([1n, aliceNode]);
      assert.equal(await contract.read.balanceOfName([aliceNode]), 1n);

      await contract.write.burn([1n]);

      assert.equal(await contract.read.balanceOfName([aliceNode]), 0n);
      await assert.rejects(contract.read.ownerOf([1n]), /ERC721NonexistentToken/);
      await assert.rejects(contract.read.nameOf([1n]), /ERC721NonexistentToken/);
    });

    it("Should clear address-bound state", async function () {
      await contract.write.mintToAddress([1n, walletA.account.address]);

      await contract.write.burn([1n]);

      assert.equal(await contract.read.balanceOf([walletA.account.address]), 0n);
      await assert.rejects(contract.read.ownerOf([1n]), /ERC721NonexistentToken/);
    });

    it("Should emit a corrective Transfer before burn when the resolver has drifted", async function () {
      await contract.write.mintToName([1n, driftNode]);
      await mockResolver.write.setAddr([driftNode, walletD.account.address]);
      await contract.write.syncOwnership([1n]);

      // Now: OZ's stored owner = walletC (mint-time), live owner = walletD.
      const logs = await transferLogs(await contract.write.burn([1n]));

      // Expect: corrective Transfer(walletC, walletD), then burn Transfer(walletD, 0).
      assert.equal(logs.length, 2);
      assert.ok(isAddressEqual(logs[0].args.from, walletC.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, walletD.account.address));
      assert.ok(isAddressEqual(logs[1].args.from, walletD.account.address));
      assert.ok(isAddressEqual(logs[1].args.to, zeroAddress));

      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should emit a single burn Transfer when the resolver has not drifted", async function () {
      await contract.write.mintToName([1n, aliceNode]);

      const logs = await transferLogs(await contract.write.burn([1n]));

      assert.equal(logs.length, 1);
      assert.ok(isAddressEqual(logs[0].args.from, walletA.account.address));
      assert.ok(isAddressEqual(logs[0].args.to, zeroAddress));
    });
  });

  describe("CCIP-Read fallback", function () {
    const ccipNode = namehash("ccip.eth");

    before(async function () {
      await setResolver(deployer, ccipNode, mockResolver.address);
      await mockResolver.write.setOffchain([ccipNode, true]);
    });

    it("Should revert strict mintToName when the resolver reverts (CCIP-Read)", async function () {
      await assert.rejects(
        contract.write.mintToName([1n, ccipNode]),
        /UnresolvedName/,
      );
    });

    it("Should fall back to address-bound when fallback is provided", async function () {
      await contract.write.mintToNameOrFallback([
        1n,
        ccipNode,
        walletE.account.address,
      ]);

      assert.ok(
        isAddressEqual(await contract.read.ownerOf([1n]), walletE.account.address),
      );
      assert.equal(await contract.read.nameOf([1n]), zeroHash);
      assert.equal(await contract.read.balanceOfName([ccipNode]), 0n);
      assert.equal(await contract.read.balanceOf([walletE.account.address]), 1n);
    });

    it("Should still mint ENS-bound when the name is resolvable", async function () {
      await contract.write.mintToNameOrFallback([
        1n,
        aliceNode,
        walletE.account.address,
      ]);

      assert.equal(await contract.read.nameOf([1n]), aliceNode);
      assert.ok(
        isAddressEqual(await contract.read.ownerOf([1n]), walletA.account.address),
      );
    });

    it("Should revert when both resolution fails and fallback is zero", async function () {
      await assert.rejects(
        contract.write.mintToNameOrFallback([1n, ccipNode, zeroAddress]),
        /UnresolvedName/,
      );
    });
  });
});
