// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title Adds Chainlink USD price feed support for ETH pricing.
abstract contract HasPriceFeed is Ownable {
    /// @dev Thrown when the price feed returns stale or invalid data.
    error StalePrice();
    /// @dev Thrown when setting an invalid (zero) price feed address.
    error InvalidPriceFeed();

    /// @dev Emitted when the price feed address is updated.
    event PriceFeedUpdated(address priceFeed);

    /// The Chainlink price feed contract.
    AggregatorV3Interface public priceFeed;

    /// @dev Initialize with a Chainlink price feed address.
    constructor(address _priceFeed) {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    /// @notice Update the Chainlink price feed address.
    function setPriceFeed(address _priceFeed) public virtual onlyOwner {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        priceFeed = AggregatorV3Interface(_priceFeed);
        emit PriceFeedUpdated(_priceFeed);
    }

    /// @dev Convert a USD amount to ETH. The `usdAmount` must use the same
    ///      decimal precision as the price feed (8 decimals for Chainlink ETH/USD).
    function _usdToEth(uint256 usdAmount) internal view virtual returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound)
            = priceFeed.latestRoundData();
        if (price <= 0) revert StalePrice();
        if (answeredInRound < roundId) revert StalePrice();
        if (block.timestamp - updatedAt > _maxStaleness()) revert StalePrice();
        return usdAmount * 1e18 / uint256(price);
    }

    /// @dev Maximum allowed staleness for the price feed (default: 1 hour).
    function _maxStaleness() internal view virtual returns (uint256) {
        return 1 hours;
    }
}

interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}
