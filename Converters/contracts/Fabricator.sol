// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
// console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Fabricator is Ownable{
    struct Blueprint {
        ERC20[] materials; //Which erc20 materials are needed for the build
        uint[] amountsRequired; //How many of each material is required per build
        uint fee;
    }

    Blueprint[] blueprints;

    constructor() Ownable(msg.sender){}

    function build(Blueprint calldata blueprint) external payable {
        require(msg.value == blueprint.fee, "Incorrect fee paid");
        for (uint i = 0; i < blueprint.materials.length; i++) {
            blueprint.materials[i].transferFrom(msg.sender, address(this), blueprint.amountsRequired[i]);
        }
    }

    function addBlueprint(ERC20[] calldata materials, uint[] calldata amountsRequired, uint fee) external onlyOwner(){
        blueprints.push(Blueprint(materials, amountsRequired, fee));
    }

    function collectFees() external onlyOwner() {
        payable(address(this)).transfer(address(this).balance);
    }

    function getBlueprint(uint at) public view returns(Blueprint memory){
        return blueprints[at];
    }
}
