// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

interface IRefinery {
    struct Blueprint {
        string uri;
        ERC20[] materials; //. Which erc20 materials are needed for fulfillment
        uint[] amountsRequired; /// How many of each material is required per amount fulfilled
        uint fee;
    }
    function fulfill(uint id, uint amount, bytes calldata data) external payable;

    function addBlueprint(uint id, string calldata uri, ERC20[] calldata materials, uint[] calldata amountsRequired, uint fee) external;

    function collectFees() external;

    function getBlueprint(uint at) external view returns(Blueprint memory);
}