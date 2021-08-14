const { expect } = require('chai')
const { ethers } = require('hardhat')

const CID = 'META_DATA_CID'

describe('WithIPFSMetaData', async () => {
  let WithIPFSMetaData,
      contract,
      owner,
      buyer,
      addrs

  before(async () => {
    WithIPFSMetaData = await ethers.getContractFactory('WithIPFSMetaDataExample')
  })

  beforeEach(async () => {
    contract = await WithIPFSMetaData.deploy(CID);
    [ owner, buyer, ...addrs ] = await ethers.getSigners()
  })

  it('Deployment should set the specified Content Identifier hash', async () => {
    expect(await contract.cid()).to.equal(CID)
  })

  it('Minted tokens should correctly link to their tokenURI', async () => {
    const transaction = await contract.connect(buyer).mint()
    const receipt = await transaction.wait()
    const tokenId = receipt.events?.find(e => e.event === 'Transfer').args.tokenId

    expect(await contract.tokenURI(tokenId)).to.equal(`ipfs://${CID}/${tokenId}/metadata.json`)
  })
})
