const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('RandomlyAssigned', async () => {
  let RandomlyAssigned,
      contract,
      owner,
      buyer,
      addrs

  before(async () => {
    RandomlyAssigned = await ethers.getContractFactory('RandomlyAssignedExample')
  })

  beforeEach(async () => {
    contract = await RandomlyAssigned.deploy();
    [ owner, buyer, ...addrs ] = await ethers.getSigners()
  })

  it('Deployment should set the specified max supply', async () => {
    expect(await contract.totalSupply()).to.equal(20)
  })

  it('Mints all tokens in random order', async () => {
    const incrementingTokenIds = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    const tokenIDs = []
    let sold = 0

    while (sold < 20) {
      const transaction = await contract.connect(buyer).mint()
      const receipt = await transaction.wait()
      const tokenID = receipt.events?.find(e => e.event === 'Transfer').args.tokenId
      tokenIDs.push(parseInt(tokenID.toString()))
      sold ++
    }

    expect(JSON.stringify(tokenIDs)).to.not.equal(incrementingTokenIds)
  })

  it('Mints all tokens, then fails on further tries', async () => {
    let sold = 0

    while (sold < 20) {
      await contract.connect(buyer).mint()
      sold ++
    }

    expect(await contract.tokenCount()).to.equal(20)

    await expect(contract.connect(buyer).mint())
                .to.be.revertedWith('No more tokens available')
  })
})
