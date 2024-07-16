// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


import {IBondingToken} from './IBondingToken.sol';
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626, ERC20, Math} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/**
 * @title BondingToken
 * @dev BondingToken contract. Enables entry and exit fees on an ERC4626 vault.
 */

contract BondingToken is IBondingToken, Ownable, ERC4626{
    using Math for uint;

    uint public constant BASIS = 1e5;

    uint entryFee;
    uint exitFee;

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol){
        setEntryFee(entryFeeBasisPoints);
        setExitFee(exitFeeBasisPoints);
    }

    function previewDeposit(uint assets) public view override returns(uint256){
        uint shares = super.previewDeposit(assets);
        return shares - shares.mulDiv(entryFee, BASIS, Math.Rounding.Ceil);
    }

    function previewMint(uint shares) public view override returns(uint256){
        uint minted = super.previewMint(shares); 
        return minted - minted.mulDiv(entryFee, BASIS, Math.Rounding.Ceil);
    }

    function previewRedeem(uint shares) public view override returns(uint256){
        uint assets = super.previewRedeem(shares); 
        return assets - assets.mulDiv(exitFee, BASIS, Math.Rounding.Ceil);
    }

    function previewWithdraw(uint assets) public view override returns(uint256){
        uint shares = super.previewWithdraw(assets);
        return shares - shares.mulDiv(exitFee, BASIS, Math.Rounding.Ceil);
    }

    function setEntryFee(uint256 entryFeeBasisPoints) public override onlyOwner{
        require(BASIS >= entryFeeBasisPoints*2, "Fee exceeds 50 percent");
        entryFee = entryFeeBasisPoints;
    }

    function setExitFee(uint256 exitFeeBasisPoints) public override onlyOwner{
        require(BASIS >= exitFeeBasisPoints*2, "Fee exceeds 50 percent");
        exitFee = exitFeeBasisPoints;
    }
}