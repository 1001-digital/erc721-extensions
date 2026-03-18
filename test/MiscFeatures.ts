import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("MiscFeatures", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [ownerWallet, userWallet] = await viem.getWalletClients();

  const DEFAULT_PRICE = parseEther("0.1");
  const CONTRACT_URI = "https://example.com/contract.json";

  async function deploy() {
    return viem.deployContract("MiscFeaturesExample", [DEFAULT_PRICE, CONTRACT_URI]);
  }

  describe("WithTokenPrices", async function () {
    it("Should set the default price on deployment", async function () {
      const contract = await deploy();
      assert.equal(await contract.read.defaultPrice(), DEFAULT_PRICE);
    });

    it("Should allow minting when paying the default price", async function () {
      const contract = await deploy();

      await contract.write.mint({ value: DEFAULT_PRICE, account: userWallet.account });
      assert.equal(await contract.read.balanceOf([userWallet.account.address]), 1n);
    });

    it("Should reject minting when underpaying", async function () {
      const contract = await deploy();

      await assert.rejects(
        contract.write.mint({ value: DEFAULT_PRICE - 1n, account: userWallet.account }),
        /InsufficientPayment/,
      );
    });

    it("Should allow owner to set a custom price for a token", async function () {
      const contract = await deploy();
      const customPrice = parseEther("0.5");

      await contract.write.setTokenPrice([1n, customPrice]);
      assert.equal(await contract.read.priceForToken([1n]), customPrice);
    });

    it("Should allow owner to set prices for multiple tokens", async function () {
      const contract = await deploy();
      const customPrice = parseEther("0.3");

      await contract.write.setTokenPrices([[1n, 2n, 3n], customPrice]);

      assert.equal(await contract.read.priceForToken([1n]), customPrice);
      assert.equal(await contract.read.priceForToken([2n]), customPrice);
      assert.equal(await contract.read.priceForToken([3n]), customPrice);
    });

    it("Should reject non-owner setting token prices", async function () {
      const contract = await deploy();

      await assert.rejects(
        contract.write.setTokenPrice([1n, parseEther("1")], { account: userWallet.account }),
        /OwnableUnauthorizedAccount/,
      );
    });
  });

  describe("WithContractMetaData", async function () {
    it("Should return the contract URI set at deployment", async function () {
      const contract = await deploy();
      assert.equal(await contract.read.contractURI(), CONTRACT_URI);
    });

    it("Should allow owner to update the contract URI", async function () {
      const contract = await deploy();
      const newURI = "https://example.com/updated.json";

      await contract.write.setContractURI([newURI]);
      assert.equal(await contract.read.contractURI(), newURI);
    });

    it("Should reject non-owner updating the contract URI", async function () {
      const contract = await deploy();

      await assert.rejects(
        contract.write.setContractURI(["https://evil.com"], { account: userWallet.account }),
        /OwnableUnauthorizedAccount/,
      );
    });
  });

  describe("WithFreezableMetadata", async function () {
    it("Should start unfrozen", async function () {
      const contract = await deploy();
      assert.equal(await contract.read.frozen(), false);
    });

    it("Should allow setting base URI when unfrozen", async function () {
      const contract = await deploy();

      await contract.write.setBaseURI(["ipfs://abc"]);
      assert.equal(await contract.read.baseURI(), "ipfs://abc");
    });

    it("Should allow owner to freeze metadata", async function () {
      const contract = await deploy();

      await contract.write.freeze();
      assert.equal(await contract.read.frozen(), true);
    });

    it("Should reject setting base URI after freezing", async function () {
      const contract = await deploy();

      await contract.write.freeze();

      await assert.rejects(
        contract.write.setBaseURI(["ipfs://new"]),
        /MetadataFrozen/,
      );
    });

    it("Should reject non-owner freezing", async function () {
      const contract = await deploy();

      await assert.rejects(
        contract.write.freeze({ account: userWallet.account }),
        /OwnableUnauthorizedAccount/,
      );
    });
  });

  describe("WithWithdrawals", async function () {
    it("Should allow owner to withdraw ETH from the contract", async function () {
      const contract = await deploy();

      // Send ETH to contract via mint
      await contract.write.mint({ value: DEFAULT_PRICE, account: userWallet.account });

      const ownerBefore = await publicClient.getBalance({ address: ownerWallet.account.address });

      const hash = await contract.write.withdraw();
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;

      const ownerAfter = await publicClient.getBalance({ address: ownerWallet.account.address });

      // Owner gets the contract balance minus gas
      assert.equal(ownerAfter - ownerBefore + gasCost, DEFAULT_PRICE);
    });

    it("Should reject non-owner withdrawals", async function () {
      const contract = await deploy();

      await assert.rejects(
        contract.write.withdraw({ account: userWallet.account }),
        /OwnableUnauthorizedAccount/,
      );
    });
  });

  describe("WithERC20Withdrawals", async function () {
    it("Should allow owner to withdraw ERC20 tokens sent to the contract", async function () {
      const contract = await deploy();
      const mockToken = await viem.deployContract("MockERC20");

      const amount = 1000n * 10n ** 18n;

      // Send tokens to the contract
      await mockToken.write.transfer([contract.address, amount]);

      // Verify contract has the tokens
      assert.equal(await mockToken.read.balanceOf([contract.address]), amount);

      // Owner withdraws
      await contract.write.withdrawERC20Token([mockToken.address]);

      // Contract balance is 0, owner got the tokens back
      assert.equal(await mockToken.read.balanceOf([contract.address]), 0n);
      assert.equal(await mockToken.read.balanceOf([ownerWallet.account.address]), await mockToken.read.totalSupply());
    });

    it("Should reject non-owner ERC20 withdrawals", async function () {
      const contract = await deploy();
      const mockToken = await viem.deployContract("MockERC20");

      await assert.rejects(
        contract.write.withdrawERC20Token([mockToken.address], { account: userWallet.account }),
        /OwnableUnauthorizedAccount/,
      );
    });
  });
});
