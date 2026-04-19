import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { network } from "hardhat";
import { namehash, parseAbi, toBytes, toHex, zeroAddress } from "viem";

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

const registryAbi = parseAbi([
  "function setResolver(bytes32 node, address resolver) external",
  "function resolver(bytes32 node) view returns (address)",
]);

function reverseNode(addr: string) {
  return namehash(`${addr.slice(2).toLowerCase()}.addr.reverse`);
}

describe("WithENSBoundOwnership", async function () {
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

  before(async function () {
    const [mockRegistry, resolver] = await Promise.all([
      viem.deployContract("MockENSRegistry", []),
      viem.deployContract("MockENSResolver", []),
    ]);
    mockResolver = resolver;

    const registryCode = await publicClient.getCode({
      address: mockRegistry.address,
    });
    await deployer.request({
      method: "hardhat_setCode" as any,
      params: [ENS_REGISTRY, registryCode],
    } as any);

    // Bind the canonical ENS_REGISTRY to our resolver for each test name.
    for (const node of [aliceNode, bobNode, driftNode]) {
      await deployer.writeContract({
        address: ENS_REGISTRY,
        abi: registryAbi,
        functionName: "setResolver",
        args: [node, mockResolver.address],
      });
    }

    // Forward records.
    await mockResolver.write.setAddr([aliceNode, walletA.account.address]);
    await mockResolver.write.setAddr([bobNode, walletB.account.address]);
    await mockResolver.write.setAddr([driftNode, walletC.account.address]);

    // Reverse records — both sides set so balanceOf's verification passes.
    for (const w of [walletA, walletB, walletC, walletD]) {
      await deployer.writeContract({
        address: ENS_REGISTRY,
        abi: registryAbi,
        functionName: "setResolver",
        args: [reverseNode(w.account.address), mockResolver.address],
      });
    }
    await mockResolver.write.setName([
      reverseNode(walletA.account.address),
      "alice.eth",
    ]);
    await mockResolver.write.setName([
      reverseNode(walletB.account.address),
      "bob.eth",
    ]);
    await mockResolver.write.setName([
      reverseNode(walletC.account.address),
      "drift.eth",
    ]);
    // walletD has no reverse name set yet; configured per-test.
  });

  describe("namehash", function () {
    it("Should match viem's namehash for a typical name", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      const result = await contract.read.namehashOf([
        toHex(toBytes("alice.eth")),
      ]);
      assert.equal(result, aliceNode);
    });

    it("Should match viem's namehash for a subdomain", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      const result = await contract.read.namehashOf([
        toHex(toBytes("vault.alice.eth")),
      ]);
      assert.equal(result, namehash("vault.alice.eth"));
    });
  });

  describe("ENS-bound mint", function () {
    it("Should resolve ownerOf via the bound name", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );

      await contract.write.mintToName([1n, aliceNode]);

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        walletA.account.address.toLowerCase(),
      );
      assert.equal(await contract.read.nameOf([1n]), aliceNode);
      assert.equal(await contract.read.balanceOfName([aliceNode]), 1n);
    });

    it("Should track balanceOf via the holder's primary name", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );

      await contract.write.mintToName([1n, aliceNode]);
      await contract.write.mintToName([2n, aliceNode]);

      assert.equal(await contract.read.balanceOf([walletA.account.address]), 2n);
      assert.equal(await contract.read.balanceOf([walletB.account.address]), 0n);
    });

    it("Should reflect resolver changes in subsequent ownerOf calls", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );

      await contract.write.mintToName([1n, driftNode]);
      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        walletC.account.address.toLowerCase(),
      );

      await mockResolver.write.setAddr([driftNode, walletD.account.address]);
      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        walletD.account.address.toLowerCase(),
      );

      // Restore for other tests.
      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should revert when binding to an unresolved name", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await assert.rejects(
        contract.write.mintToName([1n, orphanNode]),
        /UnresolvedName/,
      );
    });

    it("Should revert when binding to the zero namehash", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await assert.rejects(
        contract.write.mintToName([
          1n,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ]),
        /InvalidBinding/,
      );
    });

    it("Should revert ownerOf if the resolver is later removed", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      // Use a fresh node so we can clear it without affecting other tests.
      const freshNode = namehash("ephemeral.eth");
      await deployer.writeContract({
        address: ENS_REGISTRY,
        abi: registryAbi,
        functionName: "setResolver",
        args: [freshNode, mockResolver.address],
      });
      await mockResolver.write.setAddr([freshNode, walletE.account.address]);

      await contract.write.mintToName([1n, freshNode]);

      // Clear the resolver — name now unresolved.
      await deployer.writeContract({
        address: ENS_REGISTRY,
        abi: registryAbi,
        functionName: "setResolver",
        args: [freshNode, zeroAddress],
      });

      await assert.rejects(contract.read.ownerOf([1n]), /UnresolvedName/);
    });
  });

  describe("address-bound mint", function () {
    it("Should fix ownerOf at mint time", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );

      await contract.write.mintToAddress([1n, walletE.account.address]);

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        walletE.account.address.toLowerCase(),
      );
      assert.equal(
        await contract.read.nameOf([1n]),
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      );
      assert.equal(await contract.read.balanceOf([walletE.account.address]), 1n);
    });

    it("Should revert when binding to the zero address", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await assert.rejects(
        contract.write.mintToAddress([1n, zeroAddress]),
        /InvalidBinding/,
      );
    });
  });

  describe("hybrid balanceOf", function () {
    it("Should sum address-bound and ENS-bound holdings", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );

      await contract.write.mintToName([1n, aliceNode]);
      await contract.write.mintToAddress([2n, walletA.account.address]);

      assert.equal(await contract.read.balanceOf([walletA.account.address]), 2n);
    });

    it("Should ignore ENS holdings when reverse record doesn't verify", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );

      // walletB claims "alice.eth" via reverse record but alice.eth resolves to walletA.
      await deployer.writeContract({
        address: ENS_REGISTRY,
        abi: registryAbi,
        functionName: "setResolver",
        args: [reverseNode(walletB.account.address), mockResolver.address],
      });
      await mockResolver.write.setName([
        reverseNode(walletB.account.address),
        "alice.eth",
      ]);

      await contract.write.mintToName([1n, aliceNode]);

      // walletB should not receive credit for alice.eth's tokens.
      assert.equal(await contract.read.balanceOf([walletB.account.address]), 0n);

      // Restore bob.eth reverse record.
      await mockResolver.write.setName([
        reverseNode(walletB.account.address),
        "bob.eth",
      ]);
    });
  });

  describe("soulbound enforcement", function () {
    it("Should revert transferFrom on an ENS-bound token", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
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
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
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
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
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
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await contract.write.mintToName([1n, driftNode]);

      await mockResolver.write.setAddr([driftNode, walletD.account.address]);
      const txHash = await contract.write.syncOwnership([1n]);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      const transferTopic =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      const log = receipt.logs.find(
        (l) =>
          l.address.toLowerCase() === contract.address.toLowerCase() &&
          l.topics[0] === transferTopic,
      );
      assert.ok(log, "Transfer event not emitted");

      const fromAddr = `0x${log!.topics[1]!.slice(26)}`;
      const toAddr = `0x${log!.topics[2]!.slice(26)}`;
      assert.equal(fromAddr.toLowerCase(), walletC.account.address.toLowerCase());
      assert.equal(toAddr.toLowerCase(), walletD.account.address.toLowerCase());

      // Restore.
      await mockResolver.write.setAddr([driftNode, walletC.account.address]);
    });

    it("Should not emit when the resolved address is unchanged", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await contract.write.mintToName([1n, aliceNode]);

      const txHash = await contract.write.syncOwnership([1n]);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      const transferTopic =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
      const log = receipt.logs.find(
        (l) =>
          l.address.toLowerCase() === contract.address.toLowerCase() &&
          l.topics[0] === transferTopic,
      );
      assert.equal(log, undefined);
    });
  });

  describe("burn", function () {
    it("Should clear ENS-bound state and decrement balanceOfName", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await contract.write.mintToName([1n, aliceNode]);
      assert.equal(await contract.read.balanceOfName([aliceNode]), 1n);

      await contract.write.burn([1n]);

      assert.equal(await contract.read.balanceOfName([aliceNode]), 0n);
      await assert.rejects(contract.read.ownerOf([1n]), /ERC721NonexistentToken/);
      await assert.rejects(contract.read.nameOf([1n]), /ERC721NonexistentToken/);
    });

    it("Should clear address-bound state", async function () {
      const contract = await viem.deployContract(
        "WithENSBoundOwnershipExample",
        [],
      );
      await contract.write.mintToAddress([1n, walletA.account.address]);

      await contract.write.burn([1n]);

      assert.equal(await contract.read.balanceOf([walletA.account.address]), 0n);
      await assert.rejects(contract.read.ownerOf([1n]), /ERC721NonexistentToken/);
    });
  });
});
