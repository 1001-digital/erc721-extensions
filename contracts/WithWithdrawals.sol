// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @author 1001.digital
/// @title An extension that enables the contract owner to withdraw funds stored in the contract.
abstract contract WithWithdrawals is Ownable
{
    /// Withdraws the ETH stored in the contract.
    /// @dev only the owner can withdraw funds.
    function withdraw() onlyOwner public {
        payable(owner()).transfer(address(this).balance);
    }
}
