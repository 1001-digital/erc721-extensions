import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEventLogs } from "viem";

const CID = "META_DATA_CID";

describe("WithIPFSMetaData", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [, buyerWallet] = await viem.getWalletClients();

  it("Deployment should set the specified Content Identifier hash", async function () {
    const contract = await viem.deployContract("WithIPFSMetaDataExample", [CID]);

    assert.equal(await contract.read.cid(), CID);
  });

  it("Minted tokens should correctly link to their tokenURI", async function () {
    const contract = await viem.deployContract("WithIPFSMetaDataExample", [CID]);

    const hash = await contract.write.mint({ account: buyerWallet.account });
    const receipt = await publicClient.getTransactionReceipt({ hash });
    const logs = parseEventLogs({
      abi: contract.abi,
      logs: receipt.logs,
      eventName: "Transfer",
    });
    const tokenId = logs[0].args.tokenId;

    assert.equal(
      await contract.read.tokenURI([tokenId]),
      `ipfs://${CID}/${tokenId}/metadata.json`,
    );
  });
});
