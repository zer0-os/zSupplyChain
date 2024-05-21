// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract Refinery is Ownable, ERC1155{
    struct Blueprint {
        string uri;
        ERC20[] materials; //. Which erc20 materials are needed for fulfillment
        uint[] amountsRequired; /// How many of each material is required per amount fulfilled
        uint fee;
    }

    mapping(uint => Blueprint) public blueprints;

    constructor(string memory baseURI) Ownable(msg.sender) ERC1155(baseURI) {}

    function fulfill(uint id, uint amount, bytes calldata data) external payable {
        require(blueprints[id].materials.length != 0, "ID doesnt exist");
        require(msg.value == blueprints[id].fee * amount, "Invalid fee paid");
        for (uint i = 0; i < blueprints[id].materials.length; i++) {
            blueprints[id].materials[i].transferFrom(msg.sender, address(this), blueprints[id].amountsRequired[i]*amount);
        }
        _mint(msg.sender, id, amount, data);
    }

    function addBlueprint(uint id, string calldata uri, ERC20[] calldata materials, uint[] calldata amountsRequired, uint fee) external onlyOwner(){
        require(id != 0, "No ID");
        require(materials.length != 0, "No materials");
        require(materials.length == amountsRequired.length, "Materials length mismatch");
        require(blueprints[id].materials.length == 0, "ID taken");
        blueprints[id] = Blueprint(uri, materials, amountsRequired, fee);
    }

    function collectFees() external onlyOwner() {
        payable(owner()).transfer(address(this).balance);
    }

    function getBlueprint(uint at) public view returns(Blueprint memory){
        return blueprints[at];
    }
}
