const { expect } = require('chai')
const { ethers } = require('hardhat')
const { arrayOfLength } = require('../helpers/array')

const CID = 'META_DATA_CID'

describe('WithAdditionalMints', async () => {
  let WithAdditionalMints,
      contract,
      owner,
      buyer,
      addrs

  before(async () => {
    WithAdditionalMints = await ethers.getContractFactory('WithAdditionalMintsExample')
  })

  beforeEach(async () => {
    contract = await WithAdditionalMints.deploy(5, 1, CID);
    [ owner, buyer, ...addrs ] = await ethers.getSigners()
  })

  it('Deployment should set the specified max supply', async () => {
    expect(await contract.totalSupply()).to.equal(5)
  })

  it('Mints all tokens, then fails on further tries', async () => {
    let sold = 0

    while (sold < 5) {
      await contract.connect(buyer).mint()
      sold += 1
    }

    expect(await contract.balanceOf(buyer.address)).to.equal(5)

    await expect(contract.connect(buyer).mint())
      .to.be.revertedWith('No more tokens available')
  })

  describe('Additional Supply', () => {
    const UPDATED_CID = 'UPADATED_CID'

    beforeEach(async () => {
      let sold = 0

      while (sold < 5) {
        await contract.connect(buyer).mint()
        sold += 1
      }
    })

    it('Mints all tokens, then allows owner to create additional supply', async () => {
      await expect(contract.connect(owner).addToken(UPDATED_CID))
        .to.emit(contract, 'SupplyChanged')
        .withArgs(6)

      await expect(contract.connect(buyer).mint())
        .to.emit(contract, 'Transfer')
        .withArgs(ethers.constants.AddressZero, buyer.address, 6)

      await expect(contract.connect(buyer).mint())
        .to.be.revertedWith('No more tokens available')
    })

    it('Mints all tokens, then allows owner to mint an additional token', async () => {
      await expect(contract.connect(owner).mintAdditionalToken(UPDATED_CID, owner.address))
      .to.emit(contract, 'Transfer')
      .withArgs(ethers.constants.AddressZero, owner.address, 6)

      await expect(contract.connect(buyer).mint())
        .to.be.revertedWith('No more tokens available')
    })
  })

})
