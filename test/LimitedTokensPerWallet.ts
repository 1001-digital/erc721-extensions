import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("LimitedTokensPerWallet", async function () {
  const { viem } = await network.connect();
  const [, walletA, walletB] = await viem.getWalletClients();

  it("Should allow minting up to the limit", async function () {
    const contract = await viem.deployContract("LimitedTokensPerWalletExample", [3n]);

    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletA.account });

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 3n);
  });

  it("Should not allow minting beyond the limit", async function () {
    const contract = await viem.deployContract("LimitedTokensPerWalletExample", [2n]);

    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletA.account });

    await assert.rejects(
      contract.write.mint({ account: walletA.account }),
      /AboveAllowedTokenCount/,
    );
  });

  it("Should enforce limit on transfers too", async function () {
    const contract = await viem.deployContract("LimitedTokensPerWalletExample", [1n]);

    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletB.account });

    await assert.rejects(
      contract.write.transferFrom(
        [walletA.account.address, walletB.account.address, 1n],
        { account: walletA.account },
      ),
      /AboveAllowedTokenCount/,
    );
  });

  it("Should allow minting again after transferring away", async function () {
    const contract = await viem.deployContract("LimitedTokensPerWalletExample", [1n]);

    await contract.write.mint({ account: walletA.account });

    await contract.write.transferFrom(
      [walletA.account.address, walletB.account.address, 1n],
      { account: walletA.account },
    );

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 0n);

    await contract.write.mint({ account: walletA.account });
    assert.equal(await contract.read.balanceOf([walletA.account.address]), 1n);
  });

  it("Should allow different wallets to independently hold tokens up to the limit", async function () {
    const contract = await viem.deployContract("LimitedTokensPerWalletExample", [2n]);

    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletA.account });
    await contract.write.mint({ account: walletB.account });
    await contract.write.mint({ account: walletB.account });

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 2n);
    assert.equal(await contract.read.balanceOf([walletB.account.address]), 2n);
  });
});
