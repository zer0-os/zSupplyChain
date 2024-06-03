// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract BondingToken is Ownable, ERC4626{
    uint entryFee; /// entry fee in basis points. 0 to 100000. 1 => 0.001%. 100000 => 100% 
    uint exitFee; /// exit fee in basis points. must be > 0. 1 => 0.001%. 100000 => 100%

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol){
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
    }
    
    /// Override the deposit function to apply entry fee
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares);
        return shares;
    }

    /// Override the redeem function to apply exit fee
    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        uint256 assets = previewRedeem(shares);
        return super.redeem(assets, receiver, owner);
    }

    function previewDeposit(uint assets) public view override returns(uint256){
        return super.previewDeposit(assets) - (assets * entryFee) / 100000;
    }

    function previewRedeem(uint shares) public view override returns(uint256){
        return super.previewRedeem(shares) - (shares * exitFee) / 100000;
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external onlyOwner{
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external onlyOwner{
        exitFee = _exitFeeBasisPoints;
    }
}