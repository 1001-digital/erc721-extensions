// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @author 1001.digital
/// @title Implement a basic integrated marketplace
abstract contract WithMarketOffers is ERC721 {

    event OfferCreated(uint256 indexed tokenId, uint256 indexed value, address indexed to);
    event OfferWithdrawn(uint256 indexed tokenId);
    event Sale(uint256 indexed tokenId, address indexed from, address indexed to, uint256 value);

    struct Offer {
        uint256 price;
        address payable specificBuyer;
    }

    /// @dev All active offers
    mapping (uint256 => Offer) private _offers;

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

    /// @dev Buy an item that is for offer
    function buy(uint256 tokenId) external payable isForSale(tokenId) {
        Offer memory offer = _offers[tokenId];
        address payable seller = payable(ownerOf(tokenId));

        require(msg.value >= offer.price, "Price not met");
        seller.transfer(offer.price);
        _safeTransfer(seller, msg.sender, tokenId, "");

        emit Sale(tokenId, seller, msg.sender, offer.price);
        delete _offers[tokenId];
    }

    /// @dev Check whether the token is for sale
    modifier isForSale(uint256 tokenId) {
        require(_offers[tokenId].price > 0, "Item not for sale");
        _;
    }

}
