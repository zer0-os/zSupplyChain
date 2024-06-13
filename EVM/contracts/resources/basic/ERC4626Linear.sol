// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
 
/// achieves linear curve y=mx+b
/// m = totalSupply/totalAssets
/// b = 0

contract ERC4626Linear is ERC4626{
    constructor(string memory name, string memory symbol, IERC20 reserveToken) ERC4626(reserveToken) ERC20(name, symbol){}
}