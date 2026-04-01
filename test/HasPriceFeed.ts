import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("HasPriceFeed", async function () {
  const { viem } = await network.connect();
  const [ownerWallet, userWallet] = await viem.getWalletClients();

  // ETH/USD at $2000 with 8 decimals (Chainlink standard)
  const ETH_PRICE = 2000_00000000n;
  // Mint price: $10 with 8 decimals
  const MINT_PRICE_USD = 10_00000000n;

  async function deploy() {
    const feed = await viem.deployContract("MockPriceFeed", [ETH_PRICE]);
    const contract = await viem.deployContract("HasPriceFeedExample", [
      feed.address,
      MINT_PRICE_USD,
    ]);
    return { contract, feed };
  }

  describe("Deployment", async function () {
    it("Should set the price feed address", async function () {
      const { contract, feed } = await deploy();

      assert.equal(
        (await contract.read.priceFeed()).toLowerCase(),
        feed.address.toLowerCase(),
      );
    });
  });

  describe("USD to ETH conversion", async function () {
    it("Should convert USD to ETH correctly", async function () {
      const { contract } = await deploy();

      // $10 at $2000/ETH = 0.005 ETH
      const cost = await contract.read.cost();
      assert.equal(cost, parseEther("0.005"));
    });

    it("Should update conversion when price changes", async function () {
      const { contract, feed } = await deploy();

      // Change price to $4000
      await feed.write.setPrice([4000_00000000n]);

      // $10 at $4000/ETH = 0.0025 ETH
      const cost = await contract.read.cost();
      assert.equal(cost, parseEther("0.0025"));
    });

    it("Should revert on stale price feed", async function () {
      const { contract, feed } = await deploy();

      await feed.write.setStale();

      await assert.rejects(
        contract.read.cost(),
        /StalePrice/,
      );
    });

    it("Should revert on zero price", async function () {
      const { contract, feed } = await deploy();

      await feed.write.setPrice([0n]);

      await assert.rejects(
        contract.read.cost(),
        /StalePrice/,
      );
    });

    it("Should revert on negative price", async function () {
      const { contract, feed } = await deploy();

      await feed.write.setPrice([-1n]);

      await assert.rejects(
        contract.read.cost(),
        /StalePrice/,
      );
    });
  });

  describe("Minting with price feed", async function () {
    it("Should allow minting with sufficient ETH", async function () {
      const { contract } = await deploy();

      const cost = await contract.read.cost();

      await contract.write.mint({ value: cost, account: userWallet.account });

      assert.equal(
        await contract.read.balanceOf([userWallet.account.address]),
        1n,
      );
    });

    it("Should reject minting with insufficient ETH", async function () {
      const { contract } = await deploy();

      const cost = await contract.read.cost();

      await assert.rejects(
        contract.write.mint({ value: cost - 1n, account: userWallet.account }),
        /InsufficientPayment/,
      );
    });

    it("Should refund excess ETH", async function () {
      const { contract } = await deploy();
      const publicClient = await viem.getPublicClient();

      const cost = await contract.read.cost();
      const overpay = cost + parseEther("1");

      const balanceBefore = await publicClient.getBalance({
        address: userWallet.account.address,
      });

      const hash = await contract.write.mint({
        value: overpay,
        account: userWallet.account,
      });
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

      const balanceAfter = await publicClient.getBalance({
        address: userWallet.account.address,
      });

      // User should only have paid `cost` + gas, not the full overpay
      assert.equal(balanceBefore - balanceAfter - gasCost, cost);
    });
  });

  describe("setPriceFeed", async function () {
    it("Should allow owner to update price feed", async function () {
      const { contract } = await deploy();

      const newFeed = await viem.deployContract("MockPriceFeed", [ETH_PRICE]);

      await viem.assertions.emitWithArgs(
        contract.write.setPriceFeed([newFeed.address]),
        contract,
        "PriceFeedUpdated",
        [getAddress(newFeed.address)],
      );

      assert.equal(
        (await contract.read.priceFeed()).toLowerCase(),
        newFeed.address.toLowerCase(),
      );
    });

    it("Should reject non-owner updating price feed", async function () {
      const { contract } = await deploy();

      const newFeed = await viem.deployContract("MockPriceFeed", [ETH_PRICE]);

      await assert.rejects(
        contract.write.setPriceFeed([newFeed.address], {
          account: userWallet.account,
        }),
        /OwnableUnauthorizedAccount/,
      );
    });

    it("Should reject setting zero address", async function () {
      const { contract } = await deploy();

      await assert.rejects(
        contract.write.setPriceFeed([zeroAddress]),
        /InvalidPriceFeed/,
      );
    });
  });
});
