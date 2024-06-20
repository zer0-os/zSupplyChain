// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract BondingTokenDynamicFees is Ownable, ERC4626{
    using Math for uint;

    uint internal constant BASIS = 1e5;

    uint rateMul = BASIS;
    uint rateDiv = BASIS + 1; //nonzero

    constructor(string memory name, string memory symbol, IERC20 reserveToken, uint rateMultiplier, uint rateDivisor) 
    Ownable(msg.sender)
    ERC4626(reserveToken) 
    ERC20(name, symbol){
        rateMul = rateMultiplier;
        rateDiv = rateDivisor;
    }

    function previewDeposit(uint assets) public view override returns(uint256){
        uint shares = super.previewDeposit(assets);
        uint bonus;
        if(assets > 0){        
            // target rate
            uint target = rateMul*assets/rateDiv;
            // actual rate
            uint rate = shares/assets;
            // calculate difference with target rate
            bonus = rate - target;
        }
        return shares + bonus;
    }
}