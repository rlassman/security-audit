/*
Tests for Art Commission Contract

Bugs Found:
    - evil nft contract able to not actually transfer art
        - extra bad because even if buyer wins dispute, will never receive art and state marked complete so nothing they can do
        - should fix by checking after safeTransfer that comission contract is owner

    - upfront payment gets locked in contract forever in disputes (artist or buyer wins)
        - bad in previous scenario because buyer doesn't get refund of upfront payment or art

    - good faith release can never be successfully called, both buyerBreakFaith and artistBreakFaith must be true before hitting require, not possible

    - comment has wrong threshold for insurance (not really a bug just something to be fixed lol)
*/

// fixture (copied from codecoverage activity)
const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

describe("art_commission", function () {
    function defaultParams() {
        return {
            price: ethers.parseEther("1"),
            upfront: ethers.parseEther("0.3"),
            insurance: ethers.parseEther("0.02"),
            timeframe: 0
        };
    }
    // deploys artdao & nft contracts
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
    // deploys all contracts
    async function deployFull() {
        const [deployer, buyer, artist] = await ethers.getSigners();

        // deploy ArtDAO contract
        const ArtDAO = await ethers.getContractFactory("ArtDAO");
        const artDAO = await ArtDAO.deploy();

        // deploy nft contract
        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        const nft = await ERC721Mock.deploy("Test Art", "ART");

        // deploy art commission contract
        const { price, upfront, insurance, timeframe } = defaultParams();
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
    // deploys evil nft contract that does not transfer art
    async function deployEvilNFT() {
        const [deployer, buyer, artist] = await ethers.getSigners();

        // deploy ArtDAO contract
        const ArtDAO = await ethers.getContractFactory("ArtDAO");
        const artDAO = await ArtDAO.deploy();

        // deploy nft contract
        const ERC721Evil = await ethers.getContractFactory("ERC721Evil");
        const nft = await ERC721Evil.deploy("Test Art", "ART");

        // deploy art commission contract
        const { price, upfront, insurance, timeframe } = defaultParams();
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

    /* Helpers */
    async function confirm(commission, artist) {
        await commission.connect(artist).contractConfirm();
    }

    async function fundBoth(commission, buyer, artist, params = defaultParams()) {
        const artistFund = params.insurance / 2n;
        const buyerFund = params.insurance / 2n + params.upfront;

        await commission.connect(artist).fund({ value: artistFund });
        await commission.connect(buyer).fund({ value: buyerFund });

        return { artistFund, buyerFund };
    }

    async function submitArt(commission, nft, artist, tokenId = 1) {
        await nft.mint(artist.address, tokenId);
        await nft.connect(artist).approve(commission.target, tokenId);
        await commission.connect(artist).acceptArt(nft.target, tokenId);
    }

    async function fullSetupToAcceptedArt(commission, nft, buyer, artist) {
        const params = defaultParams();

        await confirm(commission, artist);
        await fundBoth(commission, buyer, artist, params);
        await submitArt(commission, nft, artist);

        return params;
    }
    // copied from daoDisputeFlow, sets up dao
    async function setupNewDAO() {
        const [deployer, buyer, artist, holder1, holder2, holder3, holder4] = await ethers.getSigners();

        // deploy ArtDAO contract
        const ArtDAO = await ethers.getContractFactory("ArtDAO");
        const artDAO = await ArtDAO.deploy();

        await network.provider.send("evm_increaseTime", [7 * 86400]);
        await network.provider.send("evm_mine");
        await artDAO.mint();

        await artDAO
            .connect(holder1)
            .bid(1, { value: ethers.parseEther("0.01") });
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(1);

        await network.provider.send("evm_increaseTime", [7 * 86400]);
        await network.provider.send("evm_mine");
        await artDAO.mint();

        await artDAO
            .connect(holder2)
            .bid(2, { value: ethers.parseEther("0.02") });
        await artDAO
            .connect(holder3)
            .bid(2, { value: ethers.parseEther("0.03") });
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(2);

        await network.provider.send("evm_increaseTime", [7 * 86400]);
        await network.provider.send("evm_mine");
        await artDAO.mint();

        await artDAO
            .connect(holder4)
            .bid(3, { value: ethers.parseEther("0.01") });
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(3);

         // deploy nft contract
        const ERC721Evil = await ethers.getContractFactory("ERC721Evil");
        const nft = await ERC721Evil.deploy("Test Art", "ART");

        // deploy art commission contract
        /*const { price, upfront, insurance, timeframe } = defaultParams();
        const ArtCommission = await ethers.getContractFactory("ArtCommission");
        const commission = await ArtCommission.connect(buyer).deploy(
        buyer.address,
        artist.address,
        insurance,
        price,
        upfront,
        timeframe,
        artDAO.target
        );*/

        return { artDAO, nft, deployer, buyer, artist };
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
            const timeframe = 0;

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
        
        it("Should fail with buyer = 0 address", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // set params
            const { price, upfront, insurance, timeframe } = defaultParams();

            // deploy
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            await expect(ArtCommission.connect(artist).deploy(
            ethers.ZeroAddress, // invalid buyer
            artist.address,
            insurance,
            price,
            upfront,
            timeframe,
            artDAO.target
            )).to.be.revertedWith("Invalid buyer");
        })
        it("Should fail with artist = 0 address", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // set params
            const { price, upfront, insurance, timeframe } = defaultParams();

            // deploy
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            await expect(ArtCommission.connect(buyer).deploy(
            buyer.address, 
            ethers.ZeroAddress, // invalid artist
            insurance,
            price,
            upfront,
            timeframe,
            artDAO.target
            )).to.be.revertedWith("Invalid artist");
        })
        it("Should fail with dao = 0 address", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // set params
            const { price, upfront, insurance, timeframe } = defaultParams();

            // deploy
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            await expect(ArtCommission.connect(buyer).deploy(
            buyer.address, 
            artist.address, 
            insurance,
            price,
            upfront,
            timeframe,
            ethers.ZeroAddress // invalid dao
            )).to.be.revertedWith("Invalid DAO");
        })

        it("Should fail with third party deploying", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // set params
            const { price, upfront, insurance, timeframe } = defaultParams();

            // deploy
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            await expect(ArtCommission.connect(deployer).deploy( // bad
            buyer.address,
            artist.address,
            insurance,
            price,
            upfront,
            timeframe,
            artDAO.target
            )).to.be.revertedWith("Third party cannot initiate contract");
        })
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
            const { price, upfront, insurance, timeframe } = defaultParams();

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
            const { price, upfront, insurance, timeframe } = defaultParams();
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
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );

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

            // check nft in contract
            expect(await nft.ownerOf(1)).to.equal(commission.target);
        })
        it("Non-artist called accept art", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );

            // approve and accept art
            await nft.mint(artist.address, 1);
            await nft.connect(artist).approve(commission.target, 1);
            await expect(commission.connect(buyer).acceptArt(nft.target, 1)).to.be.revertedWith("Not artist");
        })
        it("Call accept art without approving", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );

            // approve and accept art
            await nft.mint(artist.address, 1);
            await expect(commission.connect(artist).acceptArt(nft.target, 1)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        })
        it("Call accept art with nft artist doesn't own", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );

            // approve and accept art
            await nft.mint(deployer.address, 1);
            await nft.connect(deployer).approve(commission.target, 1);
            await expect(commission.connect(artist).acceptArt(nft.target, 1)).to.be.revertedWith("Sender is not owner of the nft");
        })
        it("Artist tries to transfer art back to themself after submitting", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );
            await submitArt(commission, nft, artist);

            // try to transfer art back to artist
            await expect(nft.connect(artist).transferFrom(commission.target, artist.address, 1)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
            expect(await nft.ownerOf(1)).to.equal(commission.target);
        })

        // pay in full and release
        it("Regular pay in full and release", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );
            await submitArt(commission, nft, artist);

            // pay in full and release
            const lastPayment = params.price - params.upfront;
            const tx = await commission.connect(buyer).payInFullAndRelease({
                value: lastPayment
            });
            // check nft transferred & state updated
            expect(await nft.ownerOf(1)).to.equal(buyer.address);
            expect(await commission.progress()).to.equal(4);

            // check event
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "CompletedSuccessfully");
            expect(event.args.buyer).to.equal(buyer.address); 
            expect(event.args.artist).to.equal(artist.address);

        })
        it("Wrong final payment sent", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );
            await submitArt(commission, nft, artist);

            // pay wrong amount
            const tx = await expect(commission.connect(buyer).payInFullAndRelease({
                value: params.upfront
            })).to.be.revertedWith("Not the expected full final payment");
        });

        // evil nft contract
        it("Full cycle but nft contract does not transfer nft", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployEvilNFT);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );
            await submitArt(commission, nft, artist);

            // pay in full and release
            const lastPayment = params.price - params.upfront;
            const tx = await commission.connect(buyer).payInFullAndRelease({
                value: lastPayment
            });
            expect(await commission.progress()).to.equal(4);

            // check event
            const receipt = await tx.wait();
            const event = receipt.logs.find(log => log.fragment && log.fragment.name === "CompletedSuccessfully");
            expect(event.args.buyer).to.equal(buyer.address); 
            expect(event.args.artist).to.equal(artist.address);

            // failed to transfer ownership
            expect(await nft.ownerOf(1)).to.equal(artist.address);

        })

        // good faith release
        /*
        Bug: can never sucessfully call good faith release, will always revert because buyerBreakFaith and artistBreakFaith must both become true before hitting require, not possible
        */
        it("Regular good faith release", async function () {
            const { artDAO, nft, commission, deployer, buyer, artist } = await loadFixture(deployFull);
            const params = defaultParams();
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );
            await submitArt(commission, nft, artist);

            // release - fails
            await expect(commission.connect(buyer).goodFaithRelease()).to.be.revertedWith("Both parties must approve cancellation");
            await expect(commission.connect(artist).goodFaithRelease()).to.be.revertedWith("Both parties must approve cancellation");
            
        })


    }); 
    
    describe("Test Dispute", function () {
        /*
        Bug: Even if buyer raises a dispute and wins, the broken transfer in the evil nft contract will prevent buyer from ever receiving art
        Buyer never gets upfront payment refunded bc supposed to be getting art, only insurance refunded
        Artist will still be penalized by losing insurance so they would just be doing this for the love of the game

        Bug 2: Even if buyer gets art back the upfront payment is locked in the contract forever
        */
        it("Evil nft contract with broken transfer", async function () {
            // deploy
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(setupNewDAO);
            const params = defaultParams();
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            const commission = await ArtCommission.connect(buyer).deploy(
                buyer.address,
                artist.address,
                params.insurance,
                params.price,
                params.upfront,
                params.timeframe,
                artDAO.target
            );

            // set up
            await commission.connect(artist).contractConfirm();
            const { artistFund, buyerFund } = await fundBoth(
                commission,
                buyer,
                artist,
                params
            );
            await submitArt(commission, nft, artist);

            // buyer creates dispute
            const panelSize = 3;
            const votingDuration = 300;

            await network.provider.send("evm_increaseTime", [2 * 86400]);
            await network.provider.send("evm_mine");

            await commission.connect(buyer).raiseDispute(panelSize, votingDuration);

            const disputeId = await commission.disputeId();
            await artDAO.selectJurors(disputeId, votingDuration);

            const jurors = await artDAO.getJurors(disputeId);

            for (const jurorAddr of jurors) {
                const juror = await ethers.getSigner(jurorAddr);
                await artDAO.connect(juror).vote(disputeId, 2); // buyer
            }

            await network.provider.send("evm_increaseTime", [votingDuration + 1]);
            await network.provider.send("evm_mine");

            await artDAO.resolveDispute(disputeId);

            expect(await commission.progress()).to.equal(4);
            expect(await nft.ownerOf(1)).to.equal(artist.address); // buyer does not receive art

            expect(await ethers.provider.getBalance(commission.target)).to.equal(params.upfront); // buyer's upfront payment is still in contract
        })
    });

    describe("Evil artist/buyer", function () {
        it("Artist who reverts on receiving ETH", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // deploy evil artist contract
            const EvilArtist = await ethers.getContractFactory("EvilArtist");
            const evilArtist = await EvilArtist.deploy();

            // deploy art commission contract with evil artist
            const { price, upfront, insurance, timeframe } = defaultParams();
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            const commission = await ArtCommission.connect(buyer).deploy(
                buyer.address,
                evilArtist.target,
                insurance,
                price,
                upfront,
                timeframe,
                artDAO.target
             );

             // set up
             await evilArtist.connect(deployer).confirm(commission.target);
             
             // fund
             const artistFund = insurance / 2n;
            const buyerFund = insurance / 2n + upfront;
            await evilArtist.connect(deployer).fund(commission.target, 
                { value: artistFund }
            );
            await commission.connect(buyer).fund({ value: buyerFund });

            // accept art
            await evilArtist.connect(deployer).submitArt(
                commission.target,
                nft.target,
                1
            );

            // pay - should revert
            const lastPayment = price - upfront;
            await expect(commission.connect(buyer).payInFullAndRelease({
                value: lastPayment
            })).to.be.revertedWith("i'm evil");

            // state should not update
            expect(await commission.progress()).to.equal(3);

            // no one got money back (msg.value returned to buyer)
            expect(await ethers.provider.getBalance(commission.target)).to.equal(insurance + upfront);

            // if buyer wins dispute, upfront will again be locked in contract forever
        });

        it("Buyer who reverts on receiving ETH", async function () {
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);

            // deploy evil artist contract
            const EvilBuyer = await ethers.getContractFactory("EvilBuyer");
            const evilBuyer = await EvilBuyer.deploy();

            // deploy art commission contract with evil artist
            const { price, upfront, insurance, timeframe } = defaultParams();
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            const commission = await ArtCommission.connect(artist).deploy(
                evilBuyer.target,
                artist.address,
                insurance,
                price,
                upfront,
                timeframe,
                artDAO.target
             );

             // regular set up
             await evilBuyer.connect(deployer).confirm(commission.target);
             
             // fund
             const artistFund = insurance / 2n;
             const buyerFund = insurance / 2n + upfront;
             await evilBuyer.connect(deployer).fund(commission.target, { value: buyerFund });
             await commission.connect(artist).fund({ value: artistFund });

            // accept art
            await submitArt(commission, nft, artist);

            // pay - should revert
            const lastPayment = price - upfront;
            await expect(evilBuyer.connect(deployer).payInFullAndRelease(commission.target, {value: lastPayment
            })).to.be.revertedWith("pay failed");

            // state should not update
            expect(await commission.progress()).to.equal(3);

            // no one got money back (msg.value returned to buyer)
            expect(await ethers.provider.getBalance(commission.target)).to.equal(insurance + upfront);

            // if artist wins dispute, upfront will again be locked in contract forever
        });

        // can only get past fund with price = 0, doesn't do anything malicious
        it("Buyer and artist same address", async function () {
            // deploy
            const { artDAO, nft, deployer, buyer, artist } = await loadFixture(deploy);
            const params = defaultParams();
            const ArtCommission = await ethers.getContractFactory("ArtCommission");
            const commission = await ArtCommission.connect(buyer).deploy(
                buyer.address,
                buyer.address,
                params.insurance,
                0, // bypass fund
                0,
                params.timeframe,
                artDAO.target
             );

             await commission.connect(buyer).contractConfirm();

             // fund with 0 price
            const artistFund = params.insurance / 2n;
            const buyerFund = params.insurance / 2n;
            await commission.connect(buyer).fund({ value: artistFund });
            await commission.connect(buyer).fund({ value: buyerFund });

            await submitArt(commission, nft, buyer);

            const lastPayment = 0;
            const tx = await commission.connect(buyer).payInFullAndRelease({
                value: lastPayment
            });
            expect(await commission.progress()).to.equal(4);

            // check ownsership of art
            expect(await nft.ownerOf(1)).to.equal(buyer.address);
        })
    });
})

// i feel like good faith release could be exploited but can't test as is (broken logic)
    // once buyer and artist approve, buyer could have receive that keeps calling good faith release