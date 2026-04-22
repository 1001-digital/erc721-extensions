import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Soulbound", async function () {
  const { viem } = await network.connect();
  const [, walletA, walletB] = await viem.getWalletClients();

  it("Should allow minting to a wallet", async function () {
    const contract = await viem.deployContract("SoulboundExample");

    await contract.write.mint({ account: walletA.account });

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 1n);
    assert.equal(
      (await contract.read.ownerOf([1n])).toLowerCase(),
      walletA.account.address.toLowerCase(),
    );
  });

  it("Should reject transferFrom between holders", async function () {
    const contract = await viem.deployContract("SoulboundExample");

    await contract.write.mint({ account: walletA.account });

    await assert.rejects(
      contract.write.transferFrom(
        [walletA.account.address, walletB.account.address, 1n],
        { account: walletA.account },
      ),
      /NonTransferable/,
    );
  });

  it("Should reject safeTransferFrom between holders", async function () {
    const contract = await viem.deployContract("SoulboundExample");

    await contract.write.mint({ account: walletA.account });

    await assert.rejects(
      contract.write.safeTransferFrom(
        [walletA.account.address, walletB.account.address, 1n],
        { account: walletA.account },
      ),
      /NonTransferable/,
    );
  });

  it("Should reject transfer via an approved operator", async function () {
    const contract = await viem.deployContract("SoulboundExample");

    await contract.write.mint({ account: walletA.account });
    await contract.write.setApprovalForAll(
      [walletB.account.address, true],
      { account: walletA.account },
    );

    await assert.rejects(
      contract.write.transferFrom(
        [walletA.account.address, walletB.account.address, 1n],
        { account: walletB.account },
      ),
      /NonTransferable/,
    );
  });

  it("Should allow the holder to burn their token", async function () {
    const contract = await viem.deployContract("SoulboundExample");

    await contract.write.mint({ account: walletA.account });
    await contract.write.burn([1n], { account: walletA.account });

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 0n);
  });

  it("Should allow an approved operator to burn", async function () {
    const contract = await viem.deployContract("SoulboundExample");

    await contract.write.mint({ account: walletA.account });
    await contract.write.setApprovalForAll(
      [walletB.account.address, true],
      { account: walletA.account },
    );

    await contract.write.burn([1n], { account: walletB.account });

    assert.equal(await contract.read.balanceOf([walletA.account.address]), 0n);
  });
});
