// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./WithFees.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @author 1001.digital
/// @title Implement an integrated marketplace that pays creator-fees on secondary trading gains
abstract contract OnlyOnGainsCreatorFeesMarket is ERC721, WithFees, ReentrancyGuard {

    error NoActiveOffer();
    error PrivateOffer();
    error NotApprovedOrOwner();
    error PriceNotMet();
    error ItemNotForSale();
    error PriceMustBePositive();
    error PriceMustBeHigher();
    error TransferFailed();

    event OfferCreated(uint256 indexed tokenId, uint256 indexed value, address indexed to);
    event OfferWithdrawn(uint256 indexed tokenId);
    event Sale(uint256 indexed tokenId, address indexed from, address indexed to, uint256 value);

    struct Offer {
        uint128 price;
        uint128 lastPrice;
        address payable specificBuyer;
    }

    /// @dev All active offers
    mapping (uint256 => Offer) private _offers;

    /// Instantiate the contract
    /// @param _feeRecipient the fee recipient for secondary sales
    /// @param _bps the basis points measure for the fees
    constructor (address payable _feeRecipient, uint96 _bps)
        WithFees(_feeRecipient, _bps)
    {}

    /// @dev All active offers
    function offerFor(uint256 tokenId) external view returns(Offer memory) {
        if (_offers[tokenId].price == 0) revert NoActiveOffer();

        return _offers[tokenId];
    }

    /// @dev Make a new offer.
    ///      Emits an {OfferCreated} event.
    function makeOffer(uint256 tokenId, uint128 price) external {
        _makeOffer(tokenId, price, address(0));
    }

    /// @dev Make a new offer to a specific person.
    ///      Emits an {OfferCreated} event.
    function makeOfferTo(uint256 tokenId, uint128 price, address to) external {
        _makeOffer(tokenId, price, to);
    }

    /// @dev Allow approved operators to cancel an offer.
    ///      Emits an {OfferWithdrawn} event.
    function cancelOffer(uint256 tokenId) external {
        address owner = _requireOwned(tokenId);
        if (!_isAuthorized(owner, _msgSender(), tokenId)) revert NotApprovedOrOwner();
        _cancelOffer(tokenId);
    }

    /// @dev Buy an item that is for offer.
    ///      Emits a {Sale} event.
    function buy(uint256 tokenId) external payable nonReentrant isForSale(tokenId) {
        Offer memory offer = _offers[tokenId];
        address payable seller = payable(ownerOf(tokenId));

        // If it is a private sale, make sure the buyer is the private sale recipient.
        if (offer.specificBuyer != address(0)) {
            if (offer.specificBuyer != msg.sender) revert PrivateOffer();
        }

        if (msg.value < offer.price) revert PriceNotMet();

        // Keep track of the last price of the token before transfer clears the offer.
        uint128 lastPrice = offer.lastPrice;
        uint128 salePrice = offer.price;

        // Update lastPrice in storage before transfer
        _offers[tokenId].lastPrice = salePrice;

        // CEI: Transfer token first (clears offer price via _update, but lastPrice is preserved)
        _safeTransfer(seller, msg.sender, tokenId);

        // Seller gets msg value - fees set as BPS (only on gains).
        if (lastPrice < salePrice) {
            uint128 gains = salePrice - lastPrice;
            uint256 creatorFees = uint256(gains) * bps / 10000;

            (bool sellerSuccess, ) = seller.call{value: msg.value - creatorFees}("");
            if (!sellerSuccess) revert TransferFailed();

            (bool feeSuccess, ) = beneficiary.call{value: creatorFees}("");
            if (!feeSuccess) revert TransferFailed();
        } else {
            (bool success, ) = seller.call{value: msg.value}("");
            if (!success) revert TransferFailed();
        }

        emit Sale(tokenId, seller, msg.sender, salePrice);
    }

    /// @dev Check whether the token is for sale
    modifier isForSale(uint256 tokenId) {
        if (_offers[tokenId].price == 0) revert ItemNotForSale();
        _;
    }

    /// We support ERC721 and ERC2981
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(WithFees, ERC721)
        returns (bool)
    {
        return WithFees.supportsInterface(interfaceId);
    }

    /// @dev Make a new offer.
    ///      Emits an {OfferCreated} event.
    function _makeOffer(uint256 tokenId, uint128 price, address to) internal {
        address owner = _requireOwned(tokenId);
        if (!_isAuthorized(owner, _msgSender(), tokenId)) revert NotApprovedOrOwner();
        if (price == 0) revert PriceMustBePositive();
        if (price <= _offers[tokenId].price) revert PriceMustBeHigher();

        _offers[tokenId] = Offer(price, _offers[tokenId].lastPrice, payable(to));
        emit OfferCreated(tokenId, price, to);
    }

    /// @dev Revoke an active offer.
    ///      Emits an {OfferWithdrawn} event.
    function _cancelOffer(uint256 tokenId) private {
        _offers[tokenId].price = 0;
        _offers[tokenId].specificBuyer = payable(address(0));
        emit OfferWithdrawn(tokenId);
    }

    /// @dev Clear active offers on transfers.
    ///      Emits an {OfferWithdrawn} event if an active offer exists.
    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721) returns (address) {
        address from = super._update(to, tokenId, auth);
        if (_offers[tokenId].price > 0) {
            _cancelOffer(tokenId);
        }
        return from;
    }
}
