// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "./WithLimitedSupply.sol";

/// @author 1001.digital
/// @title A token tracker that increments token IDs on each new mint.
abstract contract LinearlyAssigned is WithLimitedSupply {
    // The initial token ID
    uint256 private startFrom;

    /// Instanciate the contract
    /// @param _totalSupply how many tokens this collection should hold
    /// @param _startFrom the tokenID with which to start counting
    constructor (uint256 _totalSupply, uint256 _startFrom)
        WithLimitedSupply(_totalSupply)
    {
        startFrom = _startFrom;
    }

    /// Get the next token ID
    /// @dev Gets the next available token ID and keeps track of how many are still available.
    /// @return the next token ID
    function nextToken() internal virtual override returns (uint256) {
        super.nextToken();

        return tokenCount() + startFrom;
    }
}
