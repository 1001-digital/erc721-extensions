// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/// @author 1001.digital
/// @title Implements ERC-2981 royalty standard for NFT collections.
abstract contract WithFees is ERC721, ERC2981, Ownable {
    // The address to pay fees to
    address payable internal beneficiary;

    // The fee basis points
    uint96 internal bps;

    /// @dev Emitted when royalty info is updated
    event RoyaltyInfoChanged(address indexed beneficiary, uint96 bps);

    /// Instanciate the contract
    /// @param _beneficiary the address to send fees to
    /// @param _bps the basis points measure for the fees
    constructor (address payable _beneficiary, uint96 _bps) {
        beneficiary = _beneficiary;
        bps = _bps;
        _setDefaultRoyalty(_beneficiary, _bps);
    }

    /// Update the royalty info
    /// @param _beneficiary the new fee recipient
    /// @param _bps the new basis points
    function setRoyaltyInfo(address _beneficiary, uint96 _bps) public onlyOwner {
        beneficiary = payable(_beneficiary);
        bps = _bps;
        _setDefaultRoyalty(_beneficiary, _bps);
        emit RoyaltyInfoChanged(_beneficiary, _bps);
    }

    /// Exposes a way to update the secondary sale beneficiary
    /// @param _beneficiary the new beneficiary
    function setBeneficiary(address _beneficiary) public onlyOwner {
        beneficiary = payable(_beneficiary);
        _setDefaultRoyalty(_beneficiary, bps);
    }

    /// Make sure the contract reports support for ERC721 and ERC2981
    /// @param interfaceId the interface to check
    /// @dev extends the ERC721 method
    /// @return whether the given interface is supported
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return ERC721.supportsInterface(interfaceId)
            || ERC2981.supportsInterface(interfaceId);
    }
}
