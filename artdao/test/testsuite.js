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

        return { artDAO, nft, deployer, buyer, artist };
    }
    async function deployFull() {
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
    async function deployBurnable() {
        const [deployer, buyer, artist] = await ethers.getSigners();

        // deploy ArtDAO contract
        const ArtDAO = await ethers.getContractFactory("ArtDAO");
        const artDAO = await ArtDAO.deploy();

        // deploy nft contract
        const ERC721Burnable = await ethers.getContractFactory("ERC721Burnable");
        const nft = await ERC721Burnable.deploy("Test Art", "ART");

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
    // test art commision construction
    describe("Deploy art commission correctly", function () {
        /*
        Bug: comment in contract says insurance must be > 0.015 eth but actual threshold is > 0.0075 eth
        */
        it("Should fail on too low insurance", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // set params
            const price = ethers.parseEther("1.0");
            const upfront = ethers.parseEther("0.3");
            const insurance = ethers.parseEther("0.0074"); // must be > 0.015 eth?
            const timeframe = 30;

            // deploy
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            await expect(ArtCommission.connect(buyer).deploy(
            buyer.address,
            artist.address,
            insurance,
            price,
            upfront,
            timeframe,
            artDAO.target
            )).to.be.revertedWith("Insurance too low");
            
        })

        it("Should fail on price not >= upfront payment", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // set params
            const price = ethers.parseEther("1.0");
            const upfront = ethers.parseEther("1.3"); // too high
            const insurance = ethers.parseEther("0.02");
            const timeframe = 30;

            // deploy
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            await expect(ArtCommission.connect(buyer).deploy(
            buyer.address,
            artist.address,
            insurance,
            price,
            upfront,
            timeframe,
            artDAO.target
            )).to.be.revertedWith("Upfront exceeds full price");
        })
        // add ownership checks?
    });

    // test commission life cycle
    describe("Commission life cycle", function () {
        // confirm
        it("Regular Contract Confirm", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);

            // check state updated
            expect(await commission.progress()).to.equal(0);
            const tx = await commission.connect(artist).contractConfirm();
            expect(await commission.progress()).to.equal(1);

            // check event emitted
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "ContractConfirmed");
            expect(event.args.confirmer).to.equal(artist.address); // artist confirmed
        })
        it("Should fail if non-artist tries to confirm", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);

            await expect(commission.connect(deployer).contractConfirm()).to.be.revertedWith("Not involved party");
            await expect(commission.connect(buyer).contractConfirm()).to.be.revertedWith("Artist must approve proposed commission");
        })

        // fund
        it("Regular fund", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const insurance = ethers.parseEther("0.02");
            const upfront = ethers.parseEther("0.3");

            // confirm contract first
            await commission.connect(artist).contractConfirm();

            // fund
            const artistFund = insurance / 2n;
            const buyerFund = insurance / 2n + upfront;
            const tx = await commission.connect(artist).fund({ value: artistFund });
            const tx2 = await commission.connect(buyer).fund({ value: buyerFund });

            // check events
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "Funded");
            expect(event.args.funder).to.equal(artist.address); 
            expect(event.args.amount).to.equal(artistFund);

            const receipt2 = await tx2.wait();
            const event2 = receipt2.logs.find(log => log.fragment && log.fragment.name === "Funded");
            expect(event2.args.funder).to.equal(buyer.address); 
            expect(event2.args.amount).to.equal(buyerFund);

            // check state updated
            expect(await commission.progress()).to.equal(2);
        })
        it("Should fail if fund called before confirm", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const insurance = ethers.parseEther("0.02");
            const artistFund = insurance / 2n;
            await expect(commission.connect(artist).fund({ value: artistFund })).to.be.revertedWith("Contract has not been confirmed by both parties");
        })
        it("Should fail with wrong funding amounts", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            await commission.connect(artist).contractConfirm();
            await expect(commission.connect(artist).fund({ value: ethers.parseEther("0.02") })).to.be.revertedWith("Wrong artist funding");
            await expect(commission.connect(buyer).fund({ value: ethers.parseEther("0.02") })).to.be.revertedWith("Wrong buyer funding");
        });

        // accept art
        it("Regular accept art", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const insurance = ethers.parseEther("0.02");
            const upfront = ethers.parseEther("0.3");
            await commission.connect(artist).contractConfirm();
            const artistFund = insurance / 2n;
            const buyerFund = insurance / 2n + upfront;
            await commission.connect(artist).fund({ value: artistFund });
            await commission.connect(buyer).fund({ value: buyerFund });

            // approve and accept art
            await nft.mint(artist.address, 1);
            await nft.connect(artist).approve(commission.target, 1);
            const tx = await commission.connect(artist).acceptArt(nft.target, 1);

            // check event
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "ArtworkSubmitted");
            expect(event.args.nft).to.equal(nft.target); 
            expect(event.args.tokenId).to.equal(1);

            // check state updated
            expect(await commission.progress()).to.equal(3);
        })

        // pay in full and release
        it("Regular pay in full and release", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const insurance = ethers.parseEther("0.02");
            const upfront = ethers.parseEther("0.3");
            const price = ethers.parseEther("1");
            await commission.connect(artist).contractConfirm();
            const artistFund = insurance / 2n;
            const buyerFund = insurance / 2n + upfront;
            await commission.connect(artist).fund({ value: artistFund });
            await commission.connect(buyer).fund({ value: buyerFund });

            // approve and accept art
            await nft.mint(artist.address, 1);
            await nft.connect(artist).approve(commission.target, 1);
            await commission.connect(artist).acceptArt(nft.target, 1);

            // pay in full and release
            const lastPayment = price - upfront;
            const tx = await commission.connect(buyer).payInFullAndRelease({
                value: lastPayment
            });
            expect(await nft.ownerOf(1)).to.equal(buyer.address);
            expect(await commission.progress()).to.equal(4);

            // check event
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "CompletedSuccessfully");
            expect(event.args.buyer).to.equal(buyer.address); 
            expect(event.args.artist).to.equal(artist.address);

        })

        // good faith release

    });  
});

// what about buyer and artist same address?
    // fund will fail because both if statements will be entered (but ig it should fail bc buyer and artist should be different)

// write test where artist transfer reverts (need to make mock contract to be artist)
// write test where artist burns art - make evil nft contract
    // need to see how dispute works