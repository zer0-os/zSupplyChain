// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract BondingToken is ERC4626{
    uint entryFee = 1; /// entry fee in basis points from 1 to 100000. 1 => 0.001%. 100000 => 100% 
    uint exitFee = 1; /// exit fee in basis points from 1 to 100000. 1 => 0.001%. 100000 => 100%

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) ERC4626(reserveToken) ERC20(name, symbol){
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
    }
    
    /// Override the deposit function to apply entry fee
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        uint256 fee = (assets * entryFee) / 100000;
        uint256 netAssets = assets - fee;
        super.deposit(fee, address(this));
        return super.deposit(netAssets, receiver);
    }

    /// Override the redeem function to apply exit fee
    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        uint256 assets = previewRedeem(shares);
        uint256 fee = (assets * exitFee) / 100000;
        uint256 netAssets = assets - fee;
        super.deposit(fee, address(this));
        return super.redeem(netAssets, receiver, owner);
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external {
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external {
        exitFee = _exitFeeBasisPoints;
    }
}