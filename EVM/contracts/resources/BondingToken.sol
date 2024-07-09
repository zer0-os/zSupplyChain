// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract BondingToken is Ownable, ERC4626{
    using Math for uint;

    uint internal constant BASIS = 1e5;

    uint entryFee; /// entry fee in basis points. 0 to 100000. 1 => 0.001%. 10000 => 10% 
    uint exitFee; /// exit fee in basis points. must be > 0. 1 => 0.001%. 10000 => 10%

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint entryFeeBasisPoints, uint exitFeeBasisPoints) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol){
        entryFee = entryFeeBasisPoints;
        exitFee = exitFeeBasisPoints;
    }

    function previewDeposit(uint assets) public view override returns(uint256){
        uint shares = super.previewDeposit(assets);
        return shares - shares.mulDiv(entryFee, BASIS, Math.Rounding.Ceil);
    }

    function previewMint(uint shares) public view override returns(uint256){
        uint minted = super.previewMint(shares); 
        return minted - minted.mulDiv(exitFee, BASIS, Math.Rounding.Ceil);
    }

    function previewRedeem(uint shares) public view override returns(uint256){
        uint assets = super.previewRedeem(shares); 
        return assets - assets.mulDiv(exitFee, BASIS, Math.Rounding.Ceil);
    }

    function previewWithdraw(uint assets) public view override returns(uint256){
        uint shares = super.previewWithdraw(assets);
        return shares - shares.mulDiv(entryFee, BASIS, Math.Rounding.Ceil);
    }

    function setEntryFee(uint256 _entryFeeBasisPoints) external onlyOwner{
        require(BASIS >= _entryFeeBasisPoints*2, "Fee exceeds 50 percent");
        entryFee = _entryFeeBasisPoints;
    }

    function setExitFee(uint256 _exitFeeBasisPoints) external onlyOwner{
        require(BASIS >= _exitFeeBasisPoints*2, "Fee exceeds 50 percent");
        exitFee = _exitFeeBasisPoints;
    }
}