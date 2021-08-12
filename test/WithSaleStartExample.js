const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('WithSaleStartExample', async () => {
  const TWO_MINUTES = 120

  let saleStart,
      WithSaleStartExample,
      contract,
      owner,
      buyer,
      addrs


  before(async () => {
    saleStart = (await ethers.provider.getBlock('latest')).timestamp + TWO_MINUTES
    WithSaleStartExample = await ethers.getContractFactory('WithSaleStartExample')
  })

  beforeEach(async () => {
    contract = await WithSaleStartExample.deploy(saleStart);
    [ owner, buyer, ...addrs ] = await ethers.getSigners()
  })

  describe('Deployment', () => {
    it('Should set the right owner', async () => {
      expect(await contract.owner()).to.equal(owner.address)
    })

    it('Should set the specified sale start', async () => {
      expect(await contract.saleStart()).to.equal(saleStart)
    })
  })

  describe('Public Sale', () => {
    describe('SaleStart', () => {
      it('Should expose the saleStart time', async () => {
        expect(await contract.saleStart()).to.equal(saleStart)
      })

      it('Should be able to change sale start before the sale has started', async () => {
        await contract.connect(owner).setSaleStart(saleStart + TWO_MINUTES)
      })

      it('Should not be able to change sale start after the sale has started', async () => {
        await contract.connect(owner).setSaleStart(saleStart - TWO_MINUTES)
        await expect(contract.connect(owner).setSaleStart(saleStart + TWO_MINUTES))
          .to.be.revertedWith('Sale has already started')
      })

      it('Should not mint if sale hasn\'t started yet', async () => {
        await expect(contract.connect(buyer).mint())
          .to.be.revertedWith('Sale hasn\'t started yet')
      })

      it('Should allow mint if sale has started', async () => {
        await contract.connect(owner).setSaleStart(saleStart - TWO_MINUTES)
        await expect(contract.connect(buyer).mint())
          .to.emit(contract, 'Transfer')
      })

      it('Should emit SaleStartChanged when the sale start changes', async () => {
        const time = saleStart + TWO_MINUTES
        await expect(contract.connect(owner).setSaleStart(time))
          .to.emit(contract, 'SaleStartChanged')
          .withArgs(time)
      })
    })
  })
})
