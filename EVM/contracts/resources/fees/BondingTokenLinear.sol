// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract BondingTokenLinear is Ownable, ERC4626{
    uint entryFee; /// entry fee in basis points. 0 to 100000. 1 => 0.001%. 100000 => 100% 
    uint exitFee; /// exit fee in basis points. must be > 0. 1 => 0.001%. 100000 => 100%

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol){
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
    }

    function previewDeposit(uint assets) public view override returns(uint256){
        uint shares = super.previewDeposit(assets);
        return shares - (shares * entryFee) / 100000;
    }

    function previewRedeem(uint shares) public view override returns(uint256){
        uint assets = super.previewRedeem(shares); 
        return assets - (assets * exitFee) / 100000;
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external onlyOwner{
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external onlyOwner{
        exitFee = _exitFeeBasisPoints;
    }
}