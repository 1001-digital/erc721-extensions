const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('WithMarketOffers', async () => {
  let ContractFactory,
      contract,
      deployer,
      seller,
      buyer,
      addrs

  before(async () => {
    ContractFactory = await ethers.getContractFactory('WithMarketOffersExample')
  })

  beforeEach(async () => {
    contract = await ContractFactory.deploy();
    [ deployer, seller, buyer, ...addrs ] = await ethers.getSigners()
  })

  describe('Market', () => {
    describe('Offers', () => {
      const price = ethers.utils.parseEther('2')

      beforeEach(async () => {
        await contract.connect(seller).mint()
      })

      it('Should allow the owner of a token to add a new offer', async () => {
        await expect(contract.offerFor(1))
          .to.be.revertedWith('No active offer for this item')

        expect(await contract.connect(seller).makeOffer(1, price))
          .to.emit(contract, 'OfferCreated')
          .withArgs(1, price, ethers.constants.AddressZero);

        expect(await contract.offerFor(1)).to.eql([ price, ethers.constants.AddressZero ])
      })

      it('Should not allow non-owners to make offers', async () => {
        await expect(contract.connect(buyer).makeOffer(1, price))
          .to.be.revertedWith('Caller is neither owner nor approved')
      })

      it('Should allow a buyer to purchase an offered item', async () => {
        await contract.connect(seller).makeOffer(1, price)

        await expect(contract.connect(buyer).buy(1, { value: price }))
          .to.emit(contract, 'Sale')
          .withArgs(1, seller.address, buyer.address, price)
      })

      it('Should not allow a buyer to purchase an item that is not offered', async () => {
        await expect(contract.connect(buyer).buy(1, { value: price }))
          .to.be.revertedWith('Item not for sale')

        await contract.connect(seller).makeOffer(1, price)
        await expect(contract.connect(buyer).buy(1, { value: price }))
          .to.emit(contract, 'Sale')
          .withArgs(1, seller.address, buyer.address, price)
      })
    })

  })
})
