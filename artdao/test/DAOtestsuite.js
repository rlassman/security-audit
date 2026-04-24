const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

//Notes on issues to check

//someobody could create impossible to resolve dispute,
//making it impossible to create a valid dispute for a commission

//payout jurors in loop- if one juror payout fails, entire resolution reverts
//makes it so dispute can never be resolved

//minor design note: could use smaller uints in structs. there are only like 2^3 ppl in the world I fear 


//copied and edited from daoDisputeFlow
describe("art_DAO", () => {
    let buyer, artist, holder1, holder2, holder3, holder4;

    const price = ethers.parseEther("1.0");
    const upfront = ethers.parseEther("0.3");
    const insurance = ethers.parseEther("0.02");
    let timeframe = 1;
    let panelSize = 3;
    let votingDuration = 300;
    const VoteOption = { None: 0, Artist: 1, Buyer: 2, Neither: 3 };

    before(async () => {
        [, buyer, artist, holder1, holder2, holder3, holder4] =
            await ethers.getSigners();
    });

    async function setupNewDAO() {
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

        return artDAO;
    }

    //New function: create impossibly large panel size
    async function maliciousDisputeScenario(artDAO, voteChoice) {
        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        const nft = await ERC721Mock.deploy("Test Art", "ART");
        await nft.mint(artist.address, 1);

        panelSize = 2^256 - 1;

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

        await commission.connect(artist).contractConfirm();

        const artistFund = insurance / 2n;
        const buyerFund = insurance / 2n + upfront;

        await commission.connect(artist).fund({ value: artistFund });
        await commission.connect(buyer).fund({ value: buyerFund });

        await nft.connect(artist).approve(commission.target, 1);
        await commission.connect(artist).acceptArt(nft.target, 1);

        await network.provider.send("evm_increaseTime", [2 * 86400]);
        await network.provider.send("evm_mine");

        await commission.connect(buyer).raiseDispute(panelSize, votingDuration);

        const disputeId = await commission.disputeId();
        expect(await disputeId).to.be.greaterThan(0);
        await artDAO.selectJurors(disputeId, votingDuration);

        const jurors = await artDAO.getJurors(disputeId);
        expect(await jurors).to.exist;

        for (const jurorAddr of jurors) {
            const juror = await ethers.getSigner(jurorAddr);
            await artDAO.connect(juror).vote(disputeId, voteChoice);
        }

        await network.provider.send("evm_increaseTime", [votingDuration + 1]);
        await network.provider.send("evm_mine");

        await artDAO.resolveDispute(disputeId);

        return { commission, nft, disputeId };
    }

    //TODO simulate auction with multiple bidders
    //note: simulate evil bidder that rejects eth to rig auction
    async function competitiveAuction(artDAO) {

    }

    //TODO simulate auction with only one bidder
    //note: used in evil Juror test
    async function unpopularAuction(artDAO) { 
        await artDAO.mint();
    }

    //function to execute successful commission with no dispute
    async function successfulTransaction(artDao) {

    }

        async function createDisputeScenario(artDAO, voteChoice) {
        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        const nft = await ERC721Mock.deploy("Test Art", "ART");
        await nft.mint(artist.address, 1);

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

        await commission.connect(artist).contractConfirm();

        const artistFund = insurance / 2n;
        const buyerFund = insurance / 2n + upfront;

        await commission.connect(artist).fund({ value: artistFund });
        await commission.connect(buyer).fund({ value: buyerFund });

        await nft.connect(artist).approve(commission.target, 1);
        await commission.connect(artist).acceptArt(nft.target, 1);

        await network.provider.send("evm_increaseTime", [2 * 86400]);
        await network.provider.send("evm_mine");

        await commission.connect(buyer).raiseDispute(panelSize, votingDuration);

        const disputeId = await commission.disputeId();
        await artDAO.selectJurors(disputeId, votingDuration);

        const jurors = await artDAO.getJurors(disputeId);

        for (const jurorAddr of jurors) {
            const juror = await ethers.getSigner(jurorAddr);
            await artDAO.connect(juror).vote(disputeId, voteChoice);
        }

        await network.provider.send("evm_increaseTime", [votingDuration + 1]);
        await network.provider.send("evm_mine");

        await artDAO.resolveDispute(disputeId);

        return { commission, nft, disputeId };
    }

      async function DisputeNoVotes(artDAO) {
        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        const nft = await ERC721Mock.deploy("Test Art", "ART");
        await nft.mint(artist.address, 1);

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

        await commission.connect(artist).contractConfirm();

        const artistFund = insurance / 2n;
        const buyerFund = insurance / 2n + upfront;

        await commission.connect(artist).fund({ value: artistFund });
        await commission.connect(buyer).fund({ value: buyerFund });

        await nft.connect(artist).approve(commission.target, 1);
        await commission.connect(artist).acceptArt(nft.target, 1);

        await network.provider.send("evm_increaseTime", [2 * 86400]);
        await network.provider.send("evm_mine");

        await commission.connect(buyer).raiseDispute(panelSize, votingDuration);

        const disputeId = await commission.disputeId();
        await artDAO.selectJurors(disputeId, votingDuration);
        const jurors = await artDAO.getJurors(disputeId);
        return {disputeId, jurors};
    }

    it("Artist win", async () => {
        const artDAO = await setupNewDAO();
        const { commission, nft } = await createDisputeScenario(
            artDAO,
            VoteOption.Artist
        );

        expect(await commission.progress()).to.equal(4);
        expect(await nft.ownerOf(1)).to.equal(artist.address);
    });

    it("Buyer win", async () => {
        const artDAO = await setupNewDAO();
        const { commission, nft } = await createDisputeScenario(
            artDAO,
            VoteOption.Buyer
        );

        expect(await commission.progress()).to.equal(4);
        expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("Neither win", async () => {
        const artDAO = await setupNewDAO();
        const { commission, nft } = await createDisputeScenario(
            artDAO,
            VoteOption.Neither
        )

        expect(await commission.progress()).to.equal(4);
        expect(await nft.ownerOf(1)).to.equal(artist.address);
    });

    it("Malicious dispute", async () => {
        const artDAO = await setupNewDAO();
        const {commission, nft} = await maliciousDisputeScenario(
            artDAO,
            VoteOption.Neither
        );

        expect(await commission.progress()).to.equal(4);
        expect(await nft.ownerOf(1)).to.equal(artist.address);
    });

    it("Evil Juror", async () => {
        const artDAO = await setupNewDAO();
        const EvilJuror = await ethers.getContractFactory("EvilJuror");
        const eviljuror = await EvilJuror.deploy(artDAO, {value: 10000});
        await unpopularAuction(artDAO);
        await eviljuror.makebid(4);
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(4);

       panelSize = 3;
      
        const { disputeId, jurors } = await DisputeNoVotes(
         artDAO,
        )
        

        for (const jurorAddr of jurors) {
            if (jurorAddr != eviljuror) {
            const juror = await ethers.getSigner(jurorAddr);
            await artDAO.connect(juror).vote(disputeId, 3);
            } else {
                await eviljuror.justvote(disputeId);
            }
        }

        //each vote individually- if contract use special function instead of normal
        //see if can resolve

        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        expect(await commission.progress()).to.equal(4);
        expect(await nft.ownerOf(1)).to.equal(artist.address);

        //evil juror reject juror payout, trap dispute in limbo
    });
    it("Evil Bidder", async () => {
        //evil bidder reject ether, nobody else can outbid
    });
});
