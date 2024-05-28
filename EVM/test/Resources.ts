import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import hre from "hardhat";
  
  describe("Resources", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deploy() {
      const [deployer, user, user1] = await hre.ethers.getSigners();
      const userAddress = await user.getAddress();
      const user1Address = await user1.getAddress();

      const reserveTokenFactory = await hre.ethers.getContractFactory("ERC20Token");
      const reserveToken = await reserveTokenFactory.deploy("Wilder World", "WILD");
      const reserveTokenAddress = await reserveToken.getAddress();

      const bondingTokenFactory = await hre.ethers.getContractFactory("BondingToken");
      const bondingToken = await bondingTokenFactory.deploy("GOLD", "GLD", reserveTokenAddress);
      const bondingTokenAddress = await bondingToken.getAddress();
  
      const mintAmt = hre.ethers.parseEther("1000");
    
      await reserveToken.mint(userAddress, mintAmt);
      await reserveToken.mint(user1Address, mintAmt);
      await reserveToken.connect(user).approve(bondingTokenAddress, mintAmt);
      await reserveToken.connect(user1).approve(bondingTokenAddress, mintAmt);
      
      return { bondingToken, reserveToken, deployer, user, user1 };
    }
  
    describe("Bonding token", function () {
      it('Deploys bonding token', async function () {
        await loadFixture(deploy);
      });
      it('User 1 spends 1000 reserveToken to buy 1000 bondingToken', async function () {
        const { bondingToken, user } = await loadFixture(deploy);
        const depositAmt = hre.ethers.parseEther("1000");
        await bondingToken.connect(user).deposit(depositAmt, user);
        const bal = await bondingToken.balanceOf(user);
        expect(bal).to.equal(depositAmt);
      });
      it('User 2 spends 1000 reserveToken to buy 1000 bondingToken', async function () {
        const { bondingToken, user, user1 } = await loadFixture(deploy);
        const depositAmt = hre.ethers.parseEther("1000");
        
        await bondingToken.connect(user).deposit(depositAmt, user);
        const bal = await bondingToken.balanceOf(user);
        expect(bal).to.equal(depositAmt);

        await bondingToken.connect(user1).deposit(depositAmt, user1);
        const bal1 = await bondingToken.balanceOf(user1);
        expect(bal1).to.equal(depositAmt);
      });
      it('User 1 sells 1000 bondingToken to receive 1000 reserveToken', async function () {
        const { bondingToken, user, user1 } = await loadFixture(deploy);

        const depositAmt = hre.ethers.parseEther("1000");
        await bondingToken.connect(user).deposit(depositAmt, user);
        const depBal = await bondingToken.balanceOf(user);
        expect(depBal).to.equal(depositAmt);

        await bondingToken.connect(user1).deposit(depositAmt, user1);
        const bal1 = await bondingToken.balanceOf(user1);
        expect(bal1).to.equal(depositAmt);

        const redeemAmt = hre.ethers.parseEther("1000");
        await bondingToken.connect(user).redeem(redeemAmt, user, user);
        const bal = await bondingToken.balanceOf(user);
        expect(bal).to.equal(0);
      });
      it('User 2 sells 1000 bondingToken to receive 1000 reserveToken', async function () {
        const { bondingToken, reserveToken, user, user1 } = await loadFixture(deploy);

        const depositAmt = hre.ethers.parseEther("1000");
        await bondingToken.connect(user).deposit(depositAmt, user);
        const depBal = await bondingToken.balanceOf(user);
        expect(depBal).to.equal(depositAmt);
        
        await bondingToken.connect(user1).deposit(depositAmt, user1);
        const depBal1 = await bondingToken.balanceOf(user1);
        expect(depBal1).to.equal(depositAmt);

        const redeemAmt = hre.ethers.parseEther("1000");
        
        await bondingToken.connect(user).redeem(redeemAmt, user, user);
        const bal = await bondingToken.balanceOf(user);
        expect(bal).to.equal(0);

        await bondingToken.connect(user1).redeem(redeemAmt, user1, user1);
        const bal1 = await bondingToken.balanceOf(user1);
        const resBal = await reserveToken.balanceOf(user1);
        expect(bal1).to.equal(0);
        expect(resBal).to.equal(depositAmt);
      });
    });
  });