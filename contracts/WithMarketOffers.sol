// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./WithFees.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @author 1001.digital
/// @title Implement a basic integrated marketplace with fees
abstract contract WithMarketOffers is ERC721, WithFees, ReentrancyGuard {

    /// @dev Thrown when querying an offer that does not exist.
    error NoActiveOffer();
    /// @dev Thrown when a non-designated buyer attempts to purchase a private offer.
    error PrivateOffer();
    /// @dev Thrown when the caller is not the token owner or an approved operator.
    error NotApprovedOrOwner();
    /// @dev Thrown when msg.value is less than the offer price.
    error PriceNotMet();
    /// @dev Thrown when msg.value does not exactly match the offer price.
    error ExactPriceRequired();
    /// @dev Thrown when attempting to buy a token with no active offer.
    error ItemNotForSale();
    /// @dev Thrown when creating an offer with a zero price.
    error PriceMustBePositive();
    /// @dev Thrown when creating an offer at or below the current offer price.
    error PriceMustBeHigher();
    /// @dev Thrown when an ETH transfer to the seller or beneficiary fails.
    error TransferFailed();

    /// @dev Emitted when a new offer is created for a token.
    event OfferCreated(uint256 indexed tokenId, uint256 indexed value, address indexed to);
    /// @dev Emitted when an offer is explicitly cancelled by the owner.
    event OfferWithdrawn(uint256 indexed tokenId);
    /// @dev Emitted when a token is sold through the marketplace.
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
    function makeOffer(uint256 tokenId, uint256 price) external {
        _makeOffer(tokenId, price, address(0));
    }

    /// @dev Make a new offer to a specific person.
    ///      Emits an {OfferCreated} event.
    function makeOfferTo(uint256 tokenId, uint256 price, address to) external {
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
        if (msg.value != offer.price) revert ExactPriceRequired();

        // CEI: Transfer token first (clears offer via _update)
        _safeTransfer(seller, msg.sender, tokenId);

        // Calculate and send fees
        uint256 fee = offer.price * bps / 10000;
        uint256 sellerAmount = offer.price - fee;

        (bool sellerSuccess, ) = seller.call{value: sellerAmount}("");
        if (!sellerSuccess) revert TransferFailed();

        if (fee > 0) {
            (bool feeSuccess, ) = beneficiary.call{value: fee}("");
            if (!feeSuccess) revert TransferFailed();
        }

        emit Sale(tokenId, seller, msg.sender, offer.price);
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
    function _makeOffer(uint256 tokenId, uint256 price, address to) internal {
        address owner = _requireOwned(tokenId);
        if (!_isAuthorized(owner, _msgSender(), tokenId)) revert NotApprovedOrOwner();
        if (price == 0) revert PriceMustBePositive();
        if (price <= _offers[tokenId].price) revert PriceMustBeHigher();

        _offers[tokenId] = Offer(price, payable(to));
        emit OfferCreated(tokenId, price, to);
    }

    /// @dev Revoke an active offer.
    ///      Emits an {OfferWithdrawn} event.
    function _cancelOffer(uint256 tokenId) private {
        delete _offers[tokenId];
        emit OfferWithdrawn(tokenId);
    }

    /// @dev Clear active offers on transfers without emitting OfferWithdrawn.
    ///      The Sale or Transfer event is sufficient for off-chain indexers.
    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721) returns (address) {
        address from = super._update(to, tokenId, auth);
        if (_offers[tokenId].price > 0) {
            delete _offers[tokenId];
        }
        return from;
    }
}
