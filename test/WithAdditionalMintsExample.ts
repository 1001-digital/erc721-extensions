import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEventLogs, zeroAddress } from "viem";

const CID = "META_DATA_CID";
const UPDATED_CID = "UPADATED_CID";

describe("WithAdditionalMints", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [ownerWallet, buyerWallet] = await viem.getWalletClients();

  async function deployAndMintAll() {
    const contract = await viem.deployContract("WithAdditionalMintsExample", [5n, 1n, CID]);
    for (let i = 0; i < 5; i++) {
      await contract.write.mint({ account: buyerWallet.account });
    }
    return contract;
  }

  it("Deployment should set the specified max supply", async function () {
    const contract = await viem.deployContract("WithAdditionalMintsExample", [5n, 1n, CID]);

    assert.equal(await contract.read.totalSupply(), 5n);
  });

  it("Mints all tokens, then fails on further tries", async function () {
    const contract = await viem.deployContract("WithAdditionalMintsExample", [5n, 1n, CID]);

    for (let i = 0; i < 5; i++) {
      await contract.write.mint({ account: buyerWallet.account });
    }

    assert.equal(await contract.read.balanceOf([buyerWallet.account.address]), 5n);

    await assert.rejects(
      contract.write.mint({ account: buyerWallet.account }),
      /NoTokensAvailable/,
    );
  });

  describe("After minting all tokens", async function () {
    it("then allows owner to create additional supply", async function () {
      const contract = await deployAndMintAll();

      await viem.assertions.emitWithArgs(
        contract.write.addToken([UPDATED_CID]),
        contract,
        "SupplyChanged",
        [6n],
      );

      await viem.assertions.emitWithArgs(
        contract.write.mint({ account: buyerWallet.account }),
        contract,
        "Transfer",
        [zeroAddress, getAddress(buyerWallet.account.address), 6n],
      );

      // Verify no more available after minting the added token
      await assert.rejects(
        contract.write.mint({ account: buyerWallet.account }),
        /NoTokensAvailable/,
      );
    });

    it("then allows owner to mint an additional token", async function () {
      const contract = await deployAndMintAll();

      await viem.assertions.emitWithArgs(
        contract.write.mintAdditionalToken([UPDATED_CID, ownerWallet.account.address]),
        contract,
        "Transfer",
        [zeroAddress, getAddress(ownerWallet.account.address), 6n],
      );

      // Verify no more available
      await assert.rejects(
        contract.write.mint({ account: buyerWallet.account }),
        /NoTokensAvailable/,
      );
    });

    it("then allows owner to mint multiple additional tokens", async function () {
      const contract = await deployAndMintAll();

      const hash = await contract.write.mintAdditionalTokens([UPDATED_CID, 5n, buyerWallet.account.address]);
      const receipt = await publicClient.getTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: contract.abi,
        logs: receipt.logs,
        eventName: "Transfer",
      });

      // Should have minted tokens 6 through 10
      assert.ok(logs.some((l) => l.args.tokenId === 6n));
      assert.ok(logs.some((l) => l.args.tokenId === 10n));

      // Verify no more available
      await assert.rejects(
        contract.write.mint({ account: buyerWallet.account }),
        /NoTokensAvailable/,
      );
    });
  });
});
