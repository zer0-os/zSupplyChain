import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
//import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Converters", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deploy() {
    const [owner, user] = await hre.ethers.getSigners();
    const userAddress = await user.getAddress();

    const Fabricator = await hre.ethers.getContractFactory("Fabricator");
    const fabricator = await Fabricator.deploy();
    const fabricatorAddress = await fabricator.getAddress();

    const Material = await hre.ethers.getContractFactory("ERC20Token");
    const material1 = await Material.deploy("Coal", "COAL");
    const material2 = await Material.deploy("Gold", "GOLD");
    const materials = [material1, material2];

    const mintAmt1 = hre.ethers.parseEther("1000");
    const mintAmt2 = hre.ethers.parseEther("200");

    await material1.mint(userAddress, mintAmt1);
    await material2.mint(userAddress, mintAmt2);
    
    await material1.connect(user).approve(fabricatorAddress, mintAmt1);
    await material2.connect(user).approve(fabricatorAddress, mintAmt2);

    return { fabricator, materials, owner, user };
  }

  describe("Deploy", function () {
    it("Deploys fabricator", async function () {
      const { fabricator, materials, owner } = await loadFixture(deploy);

      expect(await fabricator.owner()).to.equal(owner.address);
    });
    it("Deploys test resource 1", async function () {
      const { fabricator, owner } = await loadFixture(deploy);

      expect(await fabricator.owner()).to.equal(owner.address);
    });
  });

  describe("Blueprints", function () {
    it("Adds new blueprint", async function () {
      const { fabricator, materials } = await loadFixture(deploy);
      const requiredAmounts = [60, 10]
      fabricator.addBlueprint(materials, requiredAmounts);
    });
    it("Builds blueprint", async function () {
      const { fabricator, materials } = await loadFixture(deploy);
      const requiredAmounts = [60, 10]
      fabricator.addBlueprint(materials, requiredAmounts);

      const blueprint = await fabricator.getBlueprint(0);
      fabricator.build(blueprint);
    });
  });
});
