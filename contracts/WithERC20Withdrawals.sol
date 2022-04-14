pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @author 1001.digital
/// @title An extension that enables the contract owner to withdraw ERC20 funds sent to the contract by error.
abstract contract WithERC20Withdrawals is Ownable
{
    using SafeERC20 for IERC20;

    /// Withdraws ERC20 tokens sent by error
    /// @dev only the owner can withdraw
    /// @param token contract to withdraw
    function withdrawERC20Token(address token) public onlyOwner {
        IERC20(token).safeTransfer(msg.sender, balanceOf(address(this)));
    }
}
