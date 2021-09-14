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

      describe('Private Offers', () => {
        it('Should allow the owner of a token to add a new private offer', async () => {
          await expect(contract.offerFor(1))
            .to.be.revertedWith('No active offer for this item')

          expect(await contract.connect(seller).makeOfferTo(1, price, buyer.address))
            .to.emit(contract, 'OfferCreated')
            .withArgs(1, price, buyer.address);

          expect(await contract.offerFor(1)).to.eql([ price, buyer.address ])
        })

        it('Should allow the private buyer to purchase the offered item', async () => {
          expect(await contract.ownerOf(1)).to.equal(seller.address)

          expect(await contract.connect(seller).makeOfferTo(1, price, buyer.address))
            .to.emit(contract, 'OfferCreated')
            .withArgs(1, price, buyer.address);

          await expect(await contract.connect(buyer).buy(1, { value: price }))
            .to.emit(contract, 'Sale')
            .withArgs(1, seller.address, buyer.address, price)

          expect(await contract.ownerOf(1)).to.equal(buyer.address)
        })

        it('Should not allow the any buyer to purchase a privately offered item', async () => {
          expect(await contract.ownerOf(1)).to.equal(seller.address)

          expect(await contract.connect(seller).makeOfferTo(1, price, buyer.address))
            .to.emit(contract, 'OfferCreated')
            .withArgs(1, price, buyer.address);

          const otherBuyer = addrs[0]

          await expect(contract.connect(otherBuyer).buy(1, { value: price }))
            .to.be.revertedWith(`Can't buy a privately offered item`)

          expect(await contract.ownerOf(1)).to.equal(seller.address)
        })
      })

      describe('Public Offers', () => {
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
          expect(await contract.ownerOf(1)).to.equal(seller.address)

          await contract.connect(seller).makeOffer(1, price)

          await expect(await contract.connect(buyer).buy(1, { value: price }))
            .to.emit(contract, 'Sale')
            .withArgs(1, seller.address, buyer.address, price)
            .to.emit(contract, 'Transfer')
            .withArgs(seller.address, buyer.address, 1)
            .to.changeEtherBalance(seller, price, {
              provider: ethers.getDefaultProvider(),
            })

          expect(await contract.ownerOf(1)).to.equal(buyer.address)
        })

        it('Should not allow a buyer to purchase an item offered for less than the set price', async () => {
          await contract.connect(seller).makeOffer(1, price)

          await expect(contract.connect(buyer).buy(1, { value: price.sub(1) }))
            .to.be.revertedWith('Price not met')
        })

        it('Should not allow a buyer to purchase an item that is not offered', async () => {
          await expect(contract.connect(buyer).buy(1, { value: price }))
            .to.be.revertedWith('Item not for sale')
        })

        it('Should allow a seller to cancel an active offer', async () => {
          await contract.connect(seller).makeOffer(1, price)
          await expect(contract.connect(seller).cancelOffer(1))
            .to.emit(contract, 'OfferWithdrawn')
            .withArgs(1)

          await expect(contract.offerFor(1))
            .to.be.revertedWith('No active offer for this item')
        })
      })
    })
  })
})
