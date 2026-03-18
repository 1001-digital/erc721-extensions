// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @author 1001.digital
/// @title A token tracker that limits the token supply and increments token IDs on each new mint.
abstract contract WithLimitedSupply {
    error NoTokensAvailable();
    error RequestedTokensNotAvailable();
    error SupplyBelowCurrentCount();

    /// @dev Emitted when the supply of this collection changes
    event SupplyChanged(uint256 indexed supply);

    // Keeps track of how many we have minted
    uint256 private _tokenCount;

    /// @dev The maximum count of tokens this token tracker will hold.
    uint256 private _totalSupply;

    /// Instanciate the contract
    /// @param totalSupply_ how many tokens this collection should hold
    constructor (uint256 totalSupply_) {
        _totalSupply = totalSupply_;
    }

    /// @dev Get the max Supply
    /// @return the maximum token count
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    /// @dev Get the current token count
    /// @return the created token count
    function tokenCount() public view returns (uint256) {
        return _tokenCount;
    }

    /// @dev Check whether tokens are still available
    /// @return the available token count
    function availableTokenCount() public view returns (uint256) {
        return totalSupply() - tokenCount();
    }

    /// @dev Increment the token count and fetch the latest count
    /// @return the next token id
    function nextToken() internal virtual returns (uint256) {
        uint256 token = _tokenCount;

        ++_tokenCount;

        return token;
    }

    /// @dev Check whether another token is still available
    modifier ensureAvailability() {
        if (availableTokenCount() == 0) revert NoTokensAvailable();
        _;
    }

    /// @param amount Check whether number of tokens are still available
    /// @dev Check whether tokens are still available
    modifier ensureAvailabilityFor(uint256 amount) {
        if (availableTokenCount() < amount) revert RequestedTokensNotAvailable();
        _;
    }

    /// Update the supply for the collection
    /// @param _supply the new token supply.
    /// @dev create additional token supply for this collection.
    function _setSupply(uint256 _supply) internal virtual {
        if (_supply <= tokenCount()) revert SupplyBelowCurrentCount();
        _totalSupply = _supply;

        emit SupplyChanged(totalSupply());
    }
}
