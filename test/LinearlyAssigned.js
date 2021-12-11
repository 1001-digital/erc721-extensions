const { expect } = require('chai')
const { ethers } = require('hardhat')
const { arrayOfLength } = require('../helpers/array')

describe('LinearlyAssigned', async () => {
  let LinearlyAssigned,
      contract,
      owner,
      buyer,
      addrs

  before(async () => {
    LinearlyAssigned = await ethers.getContractFactory('LinearlyAssignedExample')
  })

  beforeEach(async () => {
    contract = await LinearlyAssigned.deploy(20, 1);
    [ owner, buyer, ...addrs ] = await ethers.getSigners()
  })

  it('Deployment should set the specified max supply', async () => {
    expect(await contract.totalSupply()).to.equal(20)
  })

  it('Mints all tokens in linear order', async () => {
    const incrementingTokenIds = arrayOfLength(20)
    const tokenIDs = []
    let sold = 0

    while (sold < 20) {
      const transaction = await contract.connect(buyer).mint()
      const receipt = await transaction.wait()
      const tokenID = receipt.events?.find(e => e.event === 'Transfer').args.tokenId
      tokenIDs.push(parseInt(tokenID.toString()))
      sold ++
    }

    expect(tokenIDs).to.eql(incrementingTokenIds)
  })

  it('Mints all tokens, then fails on further tries', async () => {
    let sold = 0

    while (sold < 20) {
      await contract.connect(buyer).mintMany(2)
      sold += 2
    }

    expect(await contract.balanceOf(buyer.address)).to.equal(20)

    await expect(contract.connect(buyer).mint())
                .to.be.revertedWith('No more tokens available')
  })

  it('Works when minting multiple tokens within the same transaction', async () => {
    const transaction = await contract.connect(buyer).mintMany(20)
    const receipt = await transaction.wait()

    const expectedIDs = arrayOfLength(20)
    const actualIDs = receipt.events?.filter(e => e.event === 'Transfer')
                                     .map(e => e.args.tokenId.toNumber())

    expect(expectedIDs)
      .to.eql(actualIDs.sort((a, b) => a > b ? 1 : -1))

    expectedIDs.forEach(
      async id => expect(await contract.ownerOf(id)).to.equal(buyer.address)
    )
  })

  it('Throws when trying to mint more than are available', async () => {
      await expect(contract.connect(buyer).mintMany(21))
        .to.be.revertedWith('Requested number of tokens not available')
  })
})
