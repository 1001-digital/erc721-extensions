import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Soulbound1155", async function () {
  const { viem } = await network.connect();
  const [, walletA, walletB] = await viem.getWalletClients();

  it("Should allow minting to a wallet", async function () {
    const contract = await viem.deployContract("Soulbound1155Example");

    await contract.write.mint([1n, 3n], { account: walletA.account });

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      3n,
    );
  });

  it("Should reject safeTransferFrom between holders", async function () {
    const contract = await viem.deployContract("Soulbound1155Example");

    await contract.write.mint([1n, 3n], { account: walletA.account });

    await assert.rejects(
      contract.write.safeTransferFrom(
        [walletA.account.address, walletB.account.address, 1n, 1n, "0x"],
        { account: walletA.account },
      ),
      /NonTransferable/,
    );
  });

  it("Should reject safeBatchTransferFrom between holders", async function () {
    const contract = await viem.deployContract("Soulbound1155Example");

    await contract.write.mint([1n, 2n], { account: walletA.account });
    await contract.write.mint([2n, 4n], { account: walletA.account });

    await assert.rejects(
      contract.write.safeBatchTransferFrom(
        [
          walletA.account.address,
          walletB.account.address,
          [1n, 2n],
          [1n, 2n],
          "0x",
        ],
        { account: walletA.account },
      ),
      /NonTransferable/,
    );
  });

  it("Should reject transfer via an approved operator", async function () {
    const contract = await viem.deployContract("Soulbound1155Example");

    await contract.write.mint([1n, 3n], { account: walletA.account });
    await contract.write.setApprovalForAll(
      [walletB.account.address, true],
      { account: walletA.account },
    );

    await assert.rejects(
      contract.write.safeTransferFrom(
        [walletA.account.address, walletB.account.address, 1n, 1n, "0x"],
        { account: walletB.account },
      ),
      /NonTransferable/,
    );
  });

  it("Should allow the holder to burn their tokens", async function () {
    const contract = await viem.deployContract("Soulbound1155Example");

    await contract.write.mint([1n, 3n], { account: walletA.account });
    await contract.write.burn([walletA.account.address, 1n, 2n], {
      account: walletA.account,
    });

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      1n,
    );
  });

  it("Should allow batched burns via burnBatch", async function () {
    const contract = await viem.deployContract("Soulbound1155Example");

    await contract.write.mint([1n, 3n], { account: walletA.account });
    await contract.write.mint([2n, 5n], { account: walletA.account });

    await contract.write.burnBatch(
      [walletA.account.address, [1n, 2n], [3n, 5n]],
      { account: walletA.account },
    );

    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 1n]),
      0n,
    );
    assert.equal(
      await contract.read.balanceOf([walletA.account.address, 2n]),
      0n,
    );
  });
});
