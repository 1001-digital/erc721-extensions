// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

/// @author 1001.digital
/// @title A token tracker that limits the token supply and increments token IDs on each new mint.
abstract contract WithLimitedSupply {
    using Counters for Counters.Counter;

    /// @dev Emitted when the supply of this collection changes
    event SupplyChanged(uint256 indexed supply);

    // Keeps track of how many we have minted
    Counters.Counter private _tokenCount;

    /// @dev The maximum count of tokens this token tracker will hold.
    uint256 private _totalSupply;

    /// Instanciate the contract
    /// @param totalSupply_ how many tokens this collection should hold
    constructor (uint256 totalSupply_) {
        _totalSupply = totalSupply_;
    }

    /// @dev Get the max Supply
    /// @return the maximum token count
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /// @dev Get the current token count
    /// @return the created token count
    function tokenCount() public view returns (uint256) {
        return _tokenCount.current();
    }

    /// @dev Check whether tokens are still available
    /// @return the available token count
    function availableTokenCount() public view returns (uint256) {
        return totalSupply() - tokenCount();
    }

    /// @dev Increment the token count and fetch the latest count
    /// @return the next token id
    function nextToken() internal virtual returns (uint256) {
        uint256 token = _tokenCount.current();

        _tokenCount.increment();

        return token;
    }

    /// @dev Check whether another token is still available
    modifier ensureAvailability() {
        require(availableTokenCount() > 0, "No more tokens available");
        _;
    }

    /// @param amount Check whether number of tokens are still available
    /// @dev Check whether tokens are still available
    modifier ensureAvailabilityFor(uint256 amount) {
        require(availableTokenCount() >= amount, "Requested number of tokens not available");
        _;
    }

    /// Update the supply for the collection
    /// @param _supply the new token supply.
    /// @dev create additional token supply for this collection.
    function _setSupply(uint256 _supply) internal virtual {
        require(_supply > tokenCount(), "Can't set the supply to less than the current token count");
        _totalSupply = _supply;

        emit SupplyChanged(totalSupply());
    }
}
