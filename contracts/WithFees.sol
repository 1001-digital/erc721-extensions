// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./standards/HasSecondarySaleFees.sol";

/// @author 1001.digital
/// @title Implements the various fee standards that are floating around.
/// @dev We need a proper standard for this.
abstract contract WithFees is ERC721, HasSecondarySaleFees, Ownable {
    // The address to pay fees to
    address payable internal beneficiary;

    // The fee basis points
    uint256 internal bps;

    /// Instanciate the contract
    /// @param _beneficiary the address to send fees to
    /// @param _bps the basis points measure for the fees
    constructor (address payable _beneficiary, uint256 _bps) {
        beneficiary = _beneficiary;
        bps = _bps;
    }

    /// Implement the `HasSecondarySaleFees` Contract
    /// @dev implements the standard pushed by Rarible
    /// @return list of fee recipients, in our case always one
    function getFeeRecipients(uint256) public view override returns (address payable[] memory) {
        address payable[] memory recipients = new address payable[](1);
        recipients[0] = beneficiary;
        return recipients;
    }

    /// Implement the `HasSecondarySaleFees` Contract
    /// @dev implements the standard pushed by Rarible
    /// @return list of fee basis points, in our case always one
    function getFeeBps(uint256) public view override returns (uint256[] memory) {
        uint256[] memory bpsArray = new uint256[](1);
        bpsArray[0] = bps;
        return bpsArray;
    }

    /// Make sure the contract reports that it supportsthe `HasSecondarySaleFees` Interface
    /// @param interfaceId the interface to check
    /// @dev extends the ERC721 method
    /// @return whether the given interface is supported
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC165) returns (bool) {
        return interfaceId == type(HasSecondarySaleFees).interfaceId
            || ERC721.supportsInterface(interfaceId);
    }

    /// Exposes a way to update the secondary sale beneficiary
    /// @param _beneficiary the new beneficiary
    function setBeneficiary(address _beneficiary) public onlyOwner {
        beneficiary = payable(_beneficiary);
    }
}
