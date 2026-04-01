import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("WithENSReverseLookup", async function () {
  const { viem } = await network.connect();
  const [wallet] = await viem.getWalletClients();
  const contract = await viem.deployContract("WithENSReverseLookupExample", []);

  it("Should format short hex with uppercase and ellipsis", async function () {
    const result = await contract.read.shortHex([wallet.account.address]);

    assert.match(result, /^0x[0-9A-F]{4}\.\.\.[0-9A-F]{4}$/);

    const addr = wallet.account.address.toLowerCase().slice(2);
    const expectedPrefix = addr.slice(0, 4).toUpperCase();
    const expectedSuffix = addr.slice(-4).toUpperCase();
    assert.equal(result, `0x${expectedPrefix}...${expectedSuffix}`);
  });

  it("Should fall back to short hex when no ENS registry exists", async function () {
    const display = await contract.read.displayName([wallet.account.address]);
    const short = await contract.read.shortHex([wallet.account.address]);

    assert.equal(display, short);
  });

  it("Should format zero address", async function () {
    const result = await contract.read.shortHex([
      "0x0000000000000000000000000000000000000000",
    ]);
    assert.equal(result, "0x0000...0000");
  });
});
