// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title An extension that enables the contract owner to withdraw funds stored in the contract.
abstract contract WithWithdrawals is Ownable
{
    error TransferFailed();

    /// Withdraws the ETH stored in the contract.
    /// @dev only the owner can withdraw funds.
    function withdraw() onlyOwner public {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        if (!success) revert TransferFailed();
    }
}
