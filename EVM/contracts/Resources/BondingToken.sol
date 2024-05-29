// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract BondingToken is ERC4626{
    uint entryFeeBasisPoints = 1;
    uint exitFeeBasisPoints = 1;

    constructor(string memory name, string memory symbol, IERC20 reserveToken) ERC4626(reserveToken) ERC20(name, symbol){}
    
    /// Override the deposit function to apply entry fee
    function deposit(uint256 assets, address receiver) public override returns (uint256) {
        uint256 fee = (assets * entryFeeBasisPoints) / 10000;
        uint256 netAssets = assets - fee;
        return super.deposit(netAssets, receiver);
    }

    /// Override the mint function to apply entry fee
    function mint(uint256 shares, address receiver) public override returns (uint256) {
        uint256 assets = previewMint(shares);
        uint256 fee = (assets * entryFeeBasisPoints) / 10000;
        uint256 netAssets = assets - fee;
        return super.mint(netAssets, receiver);
    }

    /// Override the withdraw function to apply exit fee
    function withdraw(uint256 assets, address receiver, address owner) public override returns (uint256) {
        uint256 fee = (assets * exitFeeBasisPoints) / 10000;
        uint256 netAssets = assets - fee;
        return super.withdraw(netAssets, receiver, owner);
    }

    /// Override the redeem function to apply exit fee
    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256) {
        uint256 assets = previewRedeem(shares);
        uint256 fee = (assets * exitFeeBasisPoints) / 10000;
        uint256 netAssets = assets - fee;
        return super.redeem(netAssets, receiver, owner);
    }
}