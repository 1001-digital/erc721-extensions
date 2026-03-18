import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther, parseEventLogs, zeroAddress } from "viem";

describe("OnlyOnGainsCreatorFeesMarket", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployerWallet, sellerWallet, buyerWallet, buyerWallet2, ...otherWallets] = await viem.getWalletClients();

  async function deployAndMint() {
    const contract = await viem.deployContract("OnlyOnGainsExample");
    await contract.write.mint({ account: sellerWallet.account });
    return contract;
  }

  describe("First sale (full gains)", async function () {
    it("Should charge fees on full amount when lastPrice is 0", async function () {
      const contract = await deployAndMint();
      const price = parseEther("2");

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      const sellerBefore = await publicClient.getBalance({ address: sellerWallet.account.address });
      const beneficiaryBefore = await publicClient.getBalance({ address: deployerWallet.account.address });

      const hash = await contract.write.buy([1n], { value: price, account: buyerWallet.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });

      const saleLogs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "Sale",
      });
      assert.equal(saleLogs.length, 1);

      // 10% fee on 2 ETH gains = 0.2 ETH fee
      const sellerAfter = await publicClient.getBalance({ address: sellerWallet.account.address });
      const beneficiaryAfter = await publicClient.getBalance({ address: deployerWallet.account.address });

      assert.equal(sellerAfter - sellerBefore, parseEther("1.8"));
      assert.equal(beneficiaryAfter - beneficiaryBefore, parseEther("0.2"));
    });
  });

  describe("Second sale at higher price (gains only)", async function () {
    it("Should charge fees only on the price increase", async function () {
      const contract = await deployAndMint();
      const firstPrice = parseEther("2");
      const secondPrice = parseEther("3");

      // First sale: seller -> buyerWallet
      await contract.write.makeOffer([1n, firstPrice], { account: sellerWallet.account });
      await contract.write.buy([1n], { value: firstPrice, account: buyerWallet.account });

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        buyerWallet.account.address.toLowerCase(),
      );

      // Second sale: buyerWallet -> buyerWallet2
      await contract.write.makeOffer([1n, secondPrice], { account: buyerWallet.account });

      const seller2Before = await publicClient.getBalance({ address: buyerWallet.account.address });
      const beneficiaryBefore = await publicClient.getBalance({ address: deployerWallet.account.address });

      const hash = await contract.write.buy([1n], { value: secondPrice, account: buyerWallet2.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });

      const seller2After = await publicClient.getBalance({ address: buyerWallet.account.address });
      const beneficiaryAfter = await publicClient.getBalance({ address: deployerWallet.account.address });

      // Gains = 3 - 2 = 1 ETH, fee = 10% of 1 = 0.1 ETH
      // Seller gets 3 - 0.1 = 2.9 ETH
      assert.equal(seller2After - seller2Before, parseEther("2.9"));
      assert.equal(beneficiaryAfter - beneficiaryBefore, parseEther("0.1"));
    });
  });

  describe("Sale at same price (no gains)", async function () {
    it("Should not charge fees when price is unchanged", async function () {
      const contract = await deployAndMint();
      const price = parseEther("2");

      // First sale
      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });
      await contract.write.buy([1n], { value: price, account: buyerWallet.account });

      // Second sale at same price
      await contract.write.makeOffer([1n, price], { account: buyerWallet.account });

      const seller2Before = await publicClient.getBalance({ address: buyerWallet.account.address });

      const hash = await contract.write.buy([1n], { value: price, account: buyerWallet2.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });

      const seller2After = await publicClient.getBalance({ address: buyerWallet.account.address });

      // No gains means seller gets full price
      assert.equal(seller2After - seller2Before, price);
    });
  });

  describe("Private offers", async function () {
    it("Should allow private offers", async function () {
      const contract = await deployAndMint();
      const price = parseEther("1");

      await contract.write.makeOfferTo(
        [1n, price, buyerWallet.account.address],
        { account: sellerWallet.account },
      );

      const offer = await contract.read.offerFor([1n]);
      assert.equal(offer.specificBuyer.toLowerCase(), buyerWallet.account.address.toLowerCase());
    });

    it("Should reject non-designated buyer on private offer", async function () {
      const contract = await deployAndMint();
      const price = parseEther("1");

      await contract.write.makeOfferTo(
        [1n, price, buyerWallet.account.address],
        { account: sellerWallet.account },
      );

      await assert.rejects(
        contract.write.buy([1n], { value: price, account: buyerWallet2.account }),
        /PrivateOffer/,
      );
    });
  });

  describe("Offer management", async function () {
    it("Should revert offerFor when no active offer", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.read.offerFor([1n]),
        /NoActiveOffer/,
      );
    });

    it("Should not allow non-owners to make offers", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.write.makeOffer([1n, parseEther("1")], { account: buyerWallet.account }),
        /NotApprovedOrOwner/,
      );
    });

    it("Should allow cancelling an offer", async function () {
      const contract = await deployAndMint();
      const price = parseEther("1");

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      await viem.assertions.emitWithArgs(
        contract.write.cancelOffer([1n], { account: sellerWallet.account }),
        contract,
        "OfferWithdrawn",
        [1n],
      );

      await assert.rejects(
        contract.read.offerFor([1n]),
        /NoActiveOffer/,
      );
    });

    it("Should reject buying an item not for sale", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.write.buy([1n], { value: parseEther("1"), account: buyerWallet.account }),
        /ItemNotForSale/,
      );
    });

    it("Should reject underpaying", async function () {
      const contract = await deployAndMint();
      const price = parseEther("2");

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      await assert.rejects(
        contract.write.buy([1n], { value: parseEther("1"), account: buyerWallet.account }),
        /PriceNotMet/,
      );
    });

    it("Should reject overpaying", async function () {
      const contract = await deployAndMint();
      const price = parseEther("2");

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      await assert.rejects(
        contract.write.buy([1n], { value: price + 1n, account: buyerWallet.account }),
        /ExactPriceRequired/,
      );
    });

    it("Should clear offer when token is transferred directly", async function () {
      const contract = await deployAndMint();
      const price = parseEther("1");

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      // Transfer directly (not via buy)
      await contract.write.transferFrom(
        [sellerWallet.account.address, buyerWallet.account.address, 1n],
        { account: sellerWallet.account },
      );

      await assert.rejects(
        contract.read.offerFor([1n]),
        /NoActiveOffer/,
      );
    });
  });
});
