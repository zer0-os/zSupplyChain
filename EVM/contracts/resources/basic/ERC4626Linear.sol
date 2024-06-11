// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract ERC4626Linear is Ownable, ERC4626 {
    uint entryFee; /// entry fee in basis points. 0 to 100,000. 1 => 0.001%. 100,000 => 100%
    uint exitFee; /// exit fee in basis points. must be > 0. 1 => 0.001%. 100,000 => 100%
    uint rate = 100000; ///rate basis points, same precision as fees. slope = 1 when rate = 100,000
    uint public min;  /// y-intercept. since we can't go below zero or have negative slope, this is a minimum

    constructor(
        string memory name,
        string memory symbol,
        IERC20 reserveToken,
        uint entryFeeBasisPoints,
        uint exitFeeBasisPoints,
        uint _rate,
        uint _min
    ) 
    Ownable(msg.sender) 
    ERC4626(reserveToken) 
    ERC20(name, symbol) {
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
        rate = _rate;
        min = _min;
    }

    function previewDeposit(uint assets) public view override returns (uint256) {
        uint shares = rate*super.previewDeposit(assets)/100000 + min;
        return shares - (shares * entryFee) / 100000;
    }

    function previewRedeem(uint shares) public view override returns (uint256) {
        uint assets = 100000*super.previewRedeem(shares)/rate;
        return assets - (assets * exitFee) / 100000;
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external onlyOwner {
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external onlyOwner {
        exitFee = _exitFeeBasisPoints;
    }
}
