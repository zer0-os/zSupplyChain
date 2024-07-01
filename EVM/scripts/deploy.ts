import { ethers } from "hardhat";
async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(deployerAddress);
    const reserveTokenFactory = await ethers.getContractFactory("ERC20Token");
    const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
    const reserveTokenAddress = await reserveToken.getAddress();
    await reserveToken.mint(deployerAddress, "1000000000000000000000");

    const bondingTokenFactory = await ethers.getContractFactory("ERC4626Linear");
    const bondingToken = await bondingTokenFactory.deploy("Bonded WILD", "BWLD", reserveTokenAddress);
    const bondingTokenAddress = await bondingToken.getAddress();
    await reserveToken.approve(bondingTokenAddress, "1000000000000000000000");

    // Log the address of the deployed contracts
    console.log("BondingToken deployed to:", bondingTokenAddress);
    console.log("ERC20 deployed to ", reserveTokenAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
