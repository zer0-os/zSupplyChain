// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Refinery is Ownable, ERC1155{
    struct Blueprint {
        uint id;
        string uri;
        ERC20[] materials; //. Which erc20 materials are needed for fulfillment
        uint[] amountsRequired; /// How many of each material is required per amount fulfilled
        uint fee;
    }

    Blueprint[] public blueprints;

    constructor(string memory baseURI) Ownable(msg.sender) ERC1155(baseURI) {}

    function fulfill(Blueprint calldata blueprint, uint amount, bytes calldata data) external payable {
        require(msg.value == blueprint.fee * amount, "Invalid fee paid");
        for (uint i = 0; i < blueprint.materials.length; i++) {
            blueprint.materials[i].transferFrom(msg.sender, address(this), blueprint.amountsRequired[i]);
        }
        _mint(msg.sender, blueprint.id, amount, data);
    }

    function addBlueprint(uint id, string calldata uri, ERC20[] calldata materials, uint[] calldata amountsRequired, uint fee) external onlyOwner(){
        blueprints.push(Blueprint(id, uri, materials, amountsRequired, fee));
    }

    function collectFees() external onlyOwner() {
        payable(owner()).transfer(address(this).balance);
    }

    function getBlueprint(uint at) public view returns(Blueprint memory){
        return blueprints[at];
    }
}
