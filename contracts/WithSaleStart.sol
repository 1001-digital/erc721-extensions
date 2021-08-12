// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title An extension that enables the contract owner to set and update the date of a public sale.
abstract contract WithSaleStart is Ownable
{
    // Stores the sale start time
    uint256 private _saleStart;

    /// @dev Emitted when the sale start date changes
    event SaleStartChanged(uint256 time);

    /// @dev Initialize with a given timestamp when to start the sale
    constructor (uint256 time) {
        _saleStart = time;
    }

    /// @dev Sets the start of the sale. Only owners can do so.
    function setSaleStart(uint256 time) public virtual onlyOwner beforeSaleStart {
        _saleStart = time;
        emit SaleStartChanged(time);
    }

    /// @dev Returns the start of the sale in seconds since the Unix Epoch
    function saleStart() public view virtual returns (uint256) {
        return _saleStart;
    }

    /// @dev Returns true if the sale has started
    function saleStarted() public view virtual returns (bool) {
        return _saleStart <= block.timestamp;
    }

    /// @dev Modifier to make a function callable only after sale start
    modifier afterSaleStart() {
        require(saleStarted(), "Sale hasn't started yet");
        _;
    }

    /// @dev Modifier to make a function callable only before sale start
    modifier beforeSaleStart() {
        require(! saleStarted(), "Sale has already started");
        _;
    }
}
