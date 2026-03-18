import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEventLogs } from "viem";

import { arrayOfLength } from "../helpers/array.js";

describe("LinearlyAssigned", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [, buyerWallet] = await viem.getWalletClients();

  it("Deployment should set the specified max supply", async function () {
    const contract = await viem.deployContract("LinearlyAssignedExample", [20n, 1n]);

    assert.equal(await contract.read.totalSupply(), 20n);
  });

  it("Mints all tokens in linear order", async function () {
    const contract = await viem.deployContract("LinearlyAssignedExample", [20n, 1n]);
    const incrementingTokenIds = arrayOfLength(20);
    const tokenIDs: number[] = [];

    for (let sold = 0; sold < 20; sold++) {
      const hash = await contract.write.mint({ account: buyerWallet.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "Transfer",
      });
      tokenIDs.push(Number(logs[0].args.tokenId));
    }

    assert.deepEqual(tokenIDs, incrementingTokenIds);
  });

  it("Mints all tokens, then fails on further tries", async function () {
    const contract = await viem.deployContract("LinearlyAssignedExample", [20n, 1n]);

    for (let sold = 0; sold < 20; sold += 2) {
      await contract.write.mintMany([2n], { account: buyerWallet.account });
    }

    assert.equal(await contract.read.balanceOf([buyerWallet.account.address]), 20n);

    await assert.rejects(
      contract.write.mint({ account: buyerWallet.account }),
      /No more tokens available/,
    );
  });

  it("Works when minting multiple tokens within the same transaction", async function () {
    const contract = await viem.deployContract("LinearlyAssignedExample", [20n, 1n]);

    const hash = await contract.write.mintMany([20n], { account: buyerWallet.account });
    const receipt = await publicClient.getTransactionReceipt({ hash });
    const logs = parseEventLogs({
      abi: contract.abi,
      logs: receipt.logs,
      eventName: "Transfer",
    });

    const expectedIDs = arrayOfLength(20);
    const actualIDs = logs.map((l) => Number(l.args.tokenId)).sort((a, b) => a - b);

    assert.deepEqual(expectedIDs, actualIDs);

    for (const id of expectedIDs) {
      const owner = await contract.read.ownerOf([BigInt(id)]);
      assert.equal(owner.toLowerCase(), buyerWallet.account.address.toLowerCase());
    }
  });

  it("Throws when trying to mint more than are available", async function () {
    const contract = await viem.deployContract("LinearlyAssignedExample", [20n, 1n]);

    await assert.rejects(
      contract.write.mintMany([21n], { account: buyerWallet.account }),
      /Requested number of tokens not available/,
    );
  });
});
