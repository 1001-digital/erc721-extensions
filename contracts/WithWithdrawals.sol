// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @author 1001.digital
/// @title An extension that enables the contract owner to withdraw funds stored in the contract.
abstract contract WithWithdrawals is Ownable
{
    using SafeERC20 for IERC20;
    
    /// Withdraws the ETH stored in the contract.
    /// @dev only the owner can withdraw funds.
    function withdraw() onlyOwner public {
        payable(owner()).transfer(address(this).balance);
    }
    
    /// Withdraws ERC20 token sent by error
    /// @dev only the owner can withdraw
    /// @param token contract to withdraw
    function withdrawToken(address token) public onlyOwner {
        IERC20(token).safeTransfer(msg.sender, balanceOf(address(this)));
    }
}
