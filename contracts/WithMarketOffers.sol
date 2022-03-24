// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@1001-digital/erc721-extensions/contracts/WithFees.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @author 1001.digital
/// @title Implement a basic integrated marketplace with fees
abstract contract WithMarketOffers is ERC721, WithFees {

    event OfferCreated(uint256 indexed tokenId, uint256 indexed value, address indexed to);
    event OfferWithdrawn(uint256 indexed tokenId);
    event Sale(uint256 indexed tokenId, address indexed from, address indexed to, uint256 value);

    struct Offer {
        uint256 price;
        address payable specificBuyer;
    }

    /// @dev All active offers
    mapping (uint256 => Offer) private _offers;

    /// Instantiate the contract
    /// @param _feeRecipient the fee recipient for secondary sales
    /// @param _bps the basis points measure for the fees
    constructor (address payable _feeRecipient, uint256 _bps)
        WithFees(_feeRecipient, _bps)
    {}

    /// @dev All active offers
    function offerFor(uint256 tokenId) external view returns(Offer memory) {
        require(_offers[tokenId].price > 0, "No active offer for this item");

        return _offers[tokenId];
    }

    function _makeOffer(uint256 tokenId, uint256 price, address to) internal {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Caller is neither owner nor approved");
        require(price > 0, "Price should be higher than 0");
        require(price > _offers[tokenId].price, "Price should be higher than existing offer");

        _offers[tokenId] = Offer(price, payable(to));
        emit OfferCreated(tokenId, price, to);
    }

    /// @dev Make a new offer
    function makeOffer(uint256 tokenId, uint256 price) external {
        _makeOffer(tokenId, price, address(0));
    }

    /// @dev Make a new offer to a specific person
    function makeOfferTo(uint256 tokenId, uint256 price, address to) external {
        _makeOffer(tokenId, price, to);
    }

    /// @dev Revoke an active offer
    function cancelOffer(uint256 tokenId) external {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Caller is neither owner nor approved");
        delete _offers[tokenId];
        emit OfferWithdrawn(tokenId);
    }

    /// @dev Buy an item that is for offer
    function buy(uint256 tokenId) external payable isForSale(tokenId) {
        Offer memory offer = _offers[tokenId];
        address payable seller = payable(ownerOf(tokenId));

        // If it is a private sale, make sure the buyer is the private sale recipient.
        if (offer.specificBuyer != address(0)) {
            require(offer.specificBuyer == msg.sender, "Can't buy a privately offered item");
        }

        require(msg.value >= offer.price, "Price not met");

        // Seller gets msg value - fees set as BPS.
        seller.transfer(msg.value - (offer.price * bps / 10000));

        // We transfer the token.
        _safeTransfer(seller, msg.sender, tokenId, "");
        emit Sale(tokenId, seller, msg.sender, offer.price);
        delete _offers[tokenId];
    }

    /// @dev Check whether the token is for sale
    modifier isForSale(uint256 tokenId) {
        require(_offers[tokenId].price > 0, "Item not for sale");
        _;
    }

    /// We support the `HasSecondarySalesFees` interface
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(WithFees, ERC721)
        returns (bool)
    {
        return WithFees.supportsInterface(interfaceId);
    }

}
