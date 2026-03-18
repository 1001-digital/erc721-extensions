import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("OnePerWallet", async function () {
  const { viem } = await network.connect();
  const [, walletA, walletB] = await viem.getWalletClients();

  it("Should allow minting one token per wallet", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 1n);
  });

  it("Should not allow minting a second token to the same wallet", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });

    await assert.rejects(
      contract.write.mint({ account: walletA.account }),
      /OneTokenPerWallet/,
    );
  });

  it("Should track the token ID via tokenOf", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });

    assert.equal(await contract.read.tokenOf([walletA.account.address]), 1n);
  });

  it("Should revert tokenOf for a wallet with no token", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await assert.rejects(
      contract.read.tokenOf([walletA.account.address]),
      /NoTokenForAccount/,
    );
  });

  it("Should allow transferring to a wallet that has no token", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });

    await contract.write.transferFrom(
      [walletA.account.address, walletB.account.address, 1n],
      { account: walletA.account },
    );

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 0n);
    assert.equal(await contract.read.balanceOf([walletB.account.address]), 1n);
  });

  it("Should not allow transferring to a wallet that already has a token", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletB.account });

    await assert.rejects(
      contract.write.transferFrom(
        [walletA.account.address, walletB.account.address, 1n],
        { account: walletA.account },
      ),
      /OneTokenPerWallet/,
    );
  });

  it("Should update tokenOf after transfer", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });

    await contract.write.transferFrom(
      [walletA.account.address, walletB.account.address, 1n],
      { account: walletA.account },
    );

    await assert.rejects(
      contract.read.tokenOf([walletA.account.address]),
      /NoTokenForAccount/,
    );
    assert.equal(await contract.read.tokenOf([walletB.account.address]), 1n);
  });

  it("Should allow minting again after transferring away", async function () {
    const contract = await viem.deployContract("OnePerWalletExample");

    await contract.write.mint({ account: walletA.account });

    await contract.write.transferFrom(
      [walletA.account.address, walletB.account.address, 1n],
      { account: walletA.account },
    );

    await contract.write.mint({ account: walletA.account });
    assert.equal(await contract.read.balanceOf([walletA.account.address]), 1n);
    assert.equal(await contract.read.tokenOf([walletA.account.address]), 2n);
  });
});
