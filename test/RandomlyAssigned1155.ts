import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEventLogs } from "viem";

describe("RandomlyAssigned1155", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [, buyerWallet] = await viem.getWalletClients();

  const tokenIds = [1n, 2n, 3n];
  const supplies = [5n, 5n, 5n];

  it("Deployment should set the correct available supply", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);

    assert.equal(await contract.read.availableTokenCount(), 15n);
  });

  it("Reports available supply per token ID", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);

    assert.equal(await contract.read.availableSupplyOf([1n]), 5n);
    assert.equal(await contract.read.availableSupplyOf([2n]), 5n);
    assert.equal(await contract.read.availableSupplyOf([3n]), 5n);
  });

  it("Mints all tokens across all types", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);

    await contract.write.mint([15n], { account: buyerWallet.account });

    for (const id of tokenIds) {
      const balance = await contract.read.balanceOf([buyerWallet.account.address, id]);
      assert.equal(balance, 5n);
    }

    assert.equal(await contract.read.availableTokenCount(), 0n);
  });

  it("Distributes tokens across multiple types", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);
    const mintedIds: number[] = [];

    for (let i = 0; i < 15; i++) {
      const hash = await contract.write.mint([1n], { account: buyerWallet.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "TransferSingle",
      });
      mintedIds.push(Number(logs[0].args.id));
    }

    const uniqueTypes = new Set(mintedIds);
    assert.equal(uniqueTypes.size, 3, "Expected all three token types to be minted");
  });

  it("Decreases available supply per token type on mint", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);

    await contract.write.mint([1n], { account: buyerWallet.account });

    const total = await contract.read.availableTokenCount();
    assert.equal(total, 14n);
  });

  it("Fails when trying to mint more than available", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);

    await assert.rejects(
      contract.write.mint([16n], { account: buyerWallet.account }),
      /RequestedTokensNotAvailable/,
    );
  });

  it("Fails when all tokens are minted", async function () {
    const contract = await viem.deployContract("RandomlyAssigned1155Example", [tokenIds, supplies]);

    await contract.write.mint([15n], { account: buyerWallet.account });

    await assert.rejects(
      contract.write.mint([1n], { account: buyerWallet.account }),
      /RequestedTokensNotAvailable/,
    );
  });
});
