import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("OneOfEachPerWallet", async function () {
  const { viem } = await network.connect();
  const [, walletA, walletB] = await viem.getWalletClients();

  it("Should allow minting one of an id to a wallet", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      1n,
    );
  });

  it("Should reject minting more than one of the same id in a single call", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await assert.rejects(
      contract.write.mint([1n, 2n], { account: walletA.account }),
      /OneTokenPerWallet/,
    );
  });

  it("Should reject minting the same id twice to the same wallet", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });

    await assert.rejects(
      contract.write.mint([1n, 1n], { account: walletA.account }),
      /OneTokenPerWallet/,
    );
  });

  it("Should allow holding one of many different ids", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });
    await contract.write.mint([2n, 1n], { account: walletA.account });
    await contract.write.mint([3n, 1n], { account: walletA.account });

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      1n,
    );
    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 2n]),
      1n,
    );
    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 3n]),
      1n,
    );
  });

  it("Should allow safeTransferFrom to a recipient who does not hold that id", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });
    await contract.write.safeTransferFrom(
      [walletA.account.address, walletB.account.address, 1n, 1n, "0x"],
      { account: walletA.account },
    );

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      0n,
    );
    assert.equal(
      await contract.read.balanceOf([walletB.account.address, 1n]),
      1n,
    );
  });

  it("Should reject safeTransferFrom to a recipient who already holds that id", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });
    await contract.write.mint([1n, 1n], { account: walletB.account });

    await assert.rejects(
      contract.write.safeTransferFrom(
        [walletA.account.address, walletB.account.address, 1n, 1n, "0x"],
        { account: walletA.account },
      ),
      /OneTokenPerWallet/,
    );
  });

  it("Should reject safeBatchTransferFrom where any id would exceed one", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });
    await contract.write.mint([2n, 1n], { account: walletA.account });
    await contract.write.mint([2n, 1n], { account: walletB.account });

    await assert.rejects(
      contract.write.safeBatchTransferFrom(
        [
          walletA.account.address,
          walletB.account.address,
          [1n, 2n],
          [1n, 1n],
          "0x",
        ],
        { account: walletA.account },
      ),
      /OneTokenPerWallet/,
    );
  });

  it("Should allow safeBatchTransferFrom when every destination balance stays within cap", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });
    await contract.write.mint([2n, 1n], { account: walletA.account });

    await contract.write.safeBatchTransferFrom(
      [
        walletA.account.address,
        walletB.account.address,
        [1n, 2n],
        [1n, 1n],
        "0x",
      ],
      { account: walletA.account },
    );

    assert.equal(
      await contract.read.balanceOf([walletB.account.address, 1n]),
      1n,
    );
    assert.equal(
      await contract.read.balanceOf([walletB.account.address, 2n]),
      1n,
    );
  });

  it("Should allow re-minting an id after the holder burns it", async function () {
    const contract = await viem.deployContract("OneOfEachPerWalletExample");

    await contract.write.mint([1n, 1n], { account: walletA.account });
    await contract.write.burn([walletA.account.address, 1n, 1n], {
      account: walletA.account,
    });
    await contract.write.mint([1n, 1n], { account: walletA.account });

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      1n,
    );
  });
});
