// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./../HasPriceFeed.sol";

contract MockPriceFeed is AggregatorV3Interface {
    int256 public price;
    uint256 public updatedAt;
    uint80 public roundId;
    uint80 public answeredInRound;

    constructor(int256 _price) {
        price = _price;
        updatedAt = block.timestamp;
        roundId = 1;
        answeredInRound = 1;
    }

    function setPrice(int256 _price) external {
        price = _price;
        updatedAt = block.timestamp;
        roundId++;
        answeredInRound = roundId;
    }

    function setUpdatedAt(uint256 _updatedAt) external {
        updatedAt = _updatedAt;
    }

    function setStale() external {
        updatedAt = block.timestamp - 2 hours;
    }

    function setAnsweredInRound(uint80 _answeredInRound) external {
        answeredInRound = _answeredInRound;
    }

    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (roundId, price, 0, updatedAt, answeredInRound);
    }
}
