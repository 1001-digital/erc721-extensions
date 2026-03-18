import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther, parseEventLogs, zeroAddress } from "viem";

describe("WithMarketOffers", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployerWallet, sellerWallet, buyerWallet, ...otherWallets] = await viem.getWalletClients();

  const price = parseEther("2");

  async function deployAndMint() {
    const contract = await viem.deployContract("WithMarketOffersExample");
    await contract.write.mint({ account: sellerWallet.account });
    return contract;
  }

  describe("Private Offers", async function () {
    it("Should allow the owner of a token to add a new private offer", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.read.offerFor([1n]),
        /NoActiveOffer/,
      );

      await viem.assertions.emitWithArgs(
        contract.write.makeOfferTo([1n, price, buyerWallet.account.address], { account: sellerWallet.account }),
        contract,
        "OfferCreated",
        [1n, price, getAddress(buyerWallet.account.address)],
      );

      const offer = await contract.read.offerFor([1n]);
      assert.equal(offer.price, price);
      assert.equal(offer.specificBuyer.toLowerCase(), buyerWallet.account.address.toLowerCase());
    });

    it("Should allow the private buyer to purchase the offered item", async function () {
      const contract = await deployAndMint();

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        sellerWallet.account.address.toLowerCase(),
      );

      await contract.write.makeOfferTo([1n, price, buyerWallet.account.address], { account: sellerWallet.account });

      await viem.assertions.emitWithArgs(
        contract.write.buy([1n], { value: price, account: buyerWallet.account }),
        contract,
        "Sale",
        [1n, getAddress(sellerWallet.account.address), getAddress(buyerWallet.account.address), price],
      );

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        buyerWallet.account.address.toLowerCase(),
      );
    });

    it("Should not allow any buyer to purchase a privately offered item", async function () {
      const contract = await deployAndMint();

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        sellerWallet.account.address.toLowerCase(),
      );

      await contract.write.makeOfferTo([1n, price, buyerWallet.account.address], { account: sellerWallet.account });

      const otherBuyer = otherWallets[0];

      await assert.rejects(
        contract.write.buy([1n], { value: price, account: otherBuyer.account }),
        /PrivateOffer/,
      );

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        sellerWallet.account.address.toLowerCase(),
      );
    });
  });

  describe("Public Offers", async function () {
    it("Should allow the owner of a token to add a new offer", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.read.offerFor([1n]),
        /NoActiveOffer/,
      );

      await viem.assertions.emitWithArgs(
        contract.write.makeOffer([1n, price], { account: sellerWallet.account }),
        contract,
        "OfferCreated",
        [1n, price, zeroAddress],
      );

      const offer = await contract.read.offerFor([1n]);
      assert.equal(offer.price, price);
      assert.equal(offer.specificBuyer.toLowerCase(), zeroAddress.toLowerCase());
    });

    it("Should not allow non-owners to make offers", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.write.makeOffer([1n, price], { account: buyerWallet.account }),
        /NotApprovedOrOwner/,
      );
    });

    it("Should allow a buyer to purchase an offered item", async function () {
      const contract = await deployAndMint();

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        sellerWallet.account.address.toLowerCase(),
      );

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      const sellerBalanceBefore = await publicClient.getBalance({ address: sellerWallet.account.address });

      const hash = await contract.write.buy([1n], { value: price, account: buyerWallet.account });
      const receipt = await publicClient.getTransactionReceipt({ hash });

      // Check Sale event
      const saleLogs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "Sale",
      });
      assert.equal(saleLogs.length, 1);
      assert.equal(saleLogs[0].args.tokenId, 1n);

      // Check Transfer event
      const transferLogs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "Transfer",
      });
      assert.ok(transferLogs.length > 0);

      assert.equal(
        (await contract.read.ownerOf([1n])).toLowerCase(),
        buyerWallet.account.address.toLowerCase(),
      );

      // Seller receives price minus 10% fee = 1.8 ETH
      const sellerBalanceAfter = await publicClient.getBalance({ address: sellerWallet.account.address });
      assert.equal(sellerBalanceAfter - sellerBalanceBefore, parseEther("1.8"));
    });

    it("Should send fees to the beneficiary (deployer)", async function () {
      const contract = await deployAndMint();

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      const beneficiaryBefore = await publicClient.getBalance({ address: deployerWallet.account.address });

      await contract.write.buy([1n], { value: price, account: buyerWallet.account });

      const beneficiaryAfter = await publicClient.getBalance({ address: deployerWallet.account.address });
      // 10% of 2 ETH = 0.2 ETH
      assert.equal(beneficiaryAfter - beneficiaryBefore, parseEther("0.2"));
    });

    it("Should clear offer when token is transferred directly", async function () {
      const contract = await deployAndMint();

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

    it("Should not allow a buyer to purchase an item offered for less than the set price", async function () {
      const contract = await deployAndMint();

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      await assert.rejects(
        contract.write.buy([1n], { value: price - 1n, account: buyerWallet.account }),
        /PriceNotMet/,
      );
    });

    it("Should not allow a buyer to overpay for an offered item", async function () {
      const contract = await deployAndMint();

      await contract.write.makeOffer([1n, price], { account: sellerWallet.account });

      await assert.rejects(
        contract.write.buy([1n], { value: price + 1n, account: buyerWallet.account }),
        /ExactPriceRequired/,
      );
    });

    it("Should not allow a buyer to purchase an item that is not offered", async function () {
      const contract = await deployAndMint();

      await assert.rejects(
        contract.write.buy([1n], { value: price, account: buyerWallet.account }),
        /ItemNotForSale/,
      );
    });

    it("Should allow a seller to cancel an active offer", async function () {
      const contract = await deployAndMint();

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
  });

  describe("ERC2981 Royalties", async function () {
    it("Should return correct royalty info", async function () {
      const contract = await deployAndMint();

      const salePrice = parseEther("10");
      const [recipient, amount] = await contract.read.royaltyInfo([1n, salePrice]);

      assert.equal(recipient.toLowerCase(), deployerWallet.account.address.toLowerCase());
      // 10% of 10 ETH = 1 ETH
      assert.equal(amount, parseEther("1"));
    });

    it("Should support ERC2981 interface", async function () {
      const contract = await deployAndMint();

      // ERC2981 interfaceId = 0x2a55205a
      assert.equal(await contract.read.supportsInterface(["0x2a55205a"]), true);
    });

    it("Should support ERC721 interface", async function () {
      const contract = await deployAndMint();

      // ERC721 interfaceId = 0x80ac58cd
      assert.equal(await contract.read.supportsInterface(["0x80ac58cd"]), true);
    });
  });
});
