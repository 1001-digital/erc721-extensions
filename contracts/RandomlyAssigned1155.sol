// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @author 1001.digital
/// @title Randomly assign ERC1155 token IDs from a set of token types with individual supplies.
abstract contract RandomlyAssigned1155 {
    /// @dev Thrown when no tokens remain to be minted.
    error NoTokensAvailable();
    /// @dev Thrown when the requested mint amount exceeds available supply.
    error RequestedTokensNotAvailable();
    /// @dev Thrown when token ID and supply array lengths don't match.
    error TokenIdSupplyMismatch();

    // The available token IDs
    uint256[] private _tokenIds;

    // Remaining supply per token ID
    mapping(uint256 => uint256) private _remaining;

    // Total remaining across all token IDs
    uint256 private _totalRemaining;

    /// Instanciate the contract
    /// @param tokenIds_ the token IDs available for minting
    /// @param supplies_ the max supply for each token ID
    constructor(uint256[] memory tokenIds_, uint256[] memory supplies_) {
        if (tokenIds_.length != supplies_.length) revert TokenIdSupplyMismatch();

        for (uint256 i = 0; i < tokenIds_.length; i++) {
            _tokenIds.push(tokenIds_[i]);
            _remaining[tokenIds_[i]] = supplies_[i];
            _totalRemaining += supplies_[i];
        }
    }

    /// @dev Get the total remaining token count across all token types
    /// @return the available token count
    function availableTokenCount() public view returns (uint256) {
        return _totalRemaining;
    }

    /// @dev Get the remaining supply for a specific token ID
    /// @return the remaining supply
    function availableSupplyOf(uint256 tokenId) public view returns (uint256) {
        return _remaining[tokenId];
    }

    /// Get the next token ID
    /// @dev Randomly selects a token ID weighted by remaining supply.
    /// @return the selected token ID
    function nextToken() internal virtual returns (uint256) {
        if (_totalRemaining == 0) revert NoTokensAvailable();

        uint256 random = uint256(keccak256(
            abi.encodePacked(
                msg.sender,
                block.coinbase,
                block.prevrandao,
                block.gaslimit,
                block.timestamp
            )
        )) % _totalRemaining;

        uint256 cumulative = 0;
        uint256 selectedId;
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            cumulative += _remaining[_tokenIds[i]];
            if (random < cumulative) {
                selectedId = _tokenIds[i];
                break;
            }
        }

        _remaining[selectedId]--;
        _totalRemaining--;

        return selectedId;
    }

    /// @dev Check whether another token is still available
    modifier ensureAvailability() {
        if (_totalRemaining == 0) revert NoTokensAvailable();
        _;
    }

    /// @param amount Check whether number of tokens are still available
    /// @dev Check whether tokens are still available
    modifier ensureAvailabilityFor(uint256 amount) {
        if (_totalRemaining < amount) revert RequestedTokensNotAvailable();
        _;
    }
}
