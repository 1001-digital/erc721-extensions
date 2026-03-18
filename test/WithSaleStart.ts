import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEventLogs } from "viem";

describe("WithSaleStart", async function () {
  const TWO_MINUTES = 120n;

  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [ownerWallet, buyerWallet] = await viem.getWalletClients();

  const block = await publicClient.getBlock();
  const saleStart = block.timestamp + TWO_MINUTES;

  describe("Deployment", async function () {
    it("Should set the right owner", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      assert.equal(
        (await contract.read.owner()).toLowerCase(),
        ownerWallet.account.address.toLowerCase(),
      );
    });

    it("Should set the specified sale start", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      assert.equal(await contract.read.saleStart(), saleStart);
    });
  });

  describe("SaleStart", async function () {
    it("Should expose the saleStart time", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      assert.equal(await contract.read.saleStart(), saleStart);
    });

    it("Should be able to change sale start before the sale has started", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      await contract.write.setSaleStart([saleStart + TWO_MINUTES]);
    });

    it("Should not be able to change sale start after the sale has started", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      await contract.write.setSaleStart([saleStart - TWO_MINUTES]);

      await assert.rejects(
        contract.write.setSaleStart([saleStart + TWO_MINUTES]),
        /Sale has already started/,
      );
    });

    it("Should not mint if sale hasn't started yet", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      await assert.rejects(
        contract.write.mint({ account: buyerWallet.account }),
        /Sale hasn't started yet/,
      );
    });

    it("Should allow mint if sale has started", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      await contract.write.setSaleStart([saleStart - TWO_MINUTES]);

      const hash = await contract.write.mint({ account: buyerWallet.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "Transfer",
      });
      assert.ok(logs.length > 0, "Should emit Transfer event");
    });

    it("Should emit SaleStartChanged when the sale start changes", async function () {
      const contract = await viem.deployContract("WithSaleStartExample", [saleStart]);

      const time = saleStart + TWO_MINUTES;

      await viem.assertions.emitWithArgs(
        contract.write.setSaleStart([time]),
        contract,
        "SaleStartChanged",
        [time],
      );
    });
  });
});
