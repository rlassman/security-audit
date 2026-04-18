/*
Starting with art commission tests, might want separate file for art dao
*/

// fixture (copied from codecoverage activity)
const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers, network } = require("hardhat");
const { expect } = require("chai");


describe("art_commission", function () {
    // basic set up
    async function deploy() {
        const [deployer, buyer, artist] = await ethers.getSigners();

        // deploy ArtDAO contract
        const ArtDAO = await ethers.getContractFactory("ArtDAO");
        const artDAO = await ArtDAO.deploy();

        // deploy nft contract
        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        const nft = await ERC721Mock.deploy("Test Art", "ART");

        // deploy art commission contract
        const price = ethers.parseEther("1.0");
        const upfront = ethers.parseEther("0.3");
        const insurance = ethers.parseEther("0.02");
        const timeframe = 30;

        const ArtCommission = await ethers.getContractFactory("ArtCommission");
        const commission = await ArtCommission.connect(buyer).deploy(
        buyer.address,
        artist.address,
        insurance,
        price,
        upfront,
        timeframe,
        artDAO.target
        );

        return { artDAO, nft, commission, deployer, buyer, artist };
    }

    //
    describe("Basic", function () {
        it("Should set right owner", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deploy);

            
        })
    });
});

