// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
// console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Fabricator is Ownable, ERC1155{
    struct Blueprint {
        uint id;
        ERC20[] materials; //Which erc20 materials are needed for the build
        uint[] amountsRequired; //How many of each material is required per build
        uint fee;
    }

    Blueprint[] private blueprints;

    constructor(string memory baseURI) Ownable(msg.sender) ERC1155(baseURI) {}

    function fulfill(uint _blueprint, uint amount) external payable {
        Blueprint memory blueprint = getBlueprint(_blueprint);
        require(msg.value == blueprint.fee * amount, "Incorrect fee paid");
        for (uint i = 0; i < blueprint.materials.length; i++) {
            blueprint.materials[i].transferFrom(msg.sender, address(this), blueprint.amountsRequired[i]);
        }
        _mint(msg.sender, blueprint.id, amount, );
    }

    function addBlueprint(uint id, ERC20[] calldata materials, uint[] calldata amountsRequired, uint fee) external onlyOwner(){
        blueprints.push(Blueprint(id, materials, amountsRequired, fee));
    }

    function collectFees() external onlyOwner() {
        payable(owner()).transfer(address(this).balance);
    }

    function getBlueprint(uint at) public view returns(Blueprint memory){
        return blueprints[at];
    }

    function getNumBlueprints() external view returns(uint){
        return blueprints.length;
    }
}
