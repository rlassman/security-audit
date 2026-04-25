const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

//Notes on issues to check

//someobody could create impossible to resolve dispute,
//making it impossible to create a valid dispute for a commission -done

//payout jurors in loop- if one juror payout fails, entire resolution reverts
//makes it so dispute can never be resolved-done

//minor design note: could use smaller uints in structs. there are only like 2^33 ppl in the world I fear 


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


        async function defaultParams() {
        return {
            price: ethers.parseEther("1"),
            upfront: ethers.parseEther("0.3"),
            insurance: ethers.parseEther("0.02"),
            timeframe: 0
        };
    }
//------------------------------------------------------------------------------------------------------
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
//------------------------------------------------------------------------------------------------------
    //New function: create impossibly large panel size
    async function maliciousDisputeScenario(artDAO, voteChoice) {
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

       return {commission, nft}; 
    }
//------------------------------------------------------------------------------------------------------
    //function to execute successful commission with no dispute
    async function successfulTransaction(artDao) {

    }
//------------------------------------------------------------------------------------------------------
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
//------------------------------------------------------------------------------------------------------
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


//================================================================================================
//================================================================================================
//              Tests
//================================================================================================
//================================================================================================


//------------------------------------------------------------------------------------------------------
//BUG//
    it("Malicious dispute cannot proceed", async () => {
        panelSize = 2^256 - 1;

        const artDAO = await setupNewDAO();
        const {commission, nft} = await maliciousDisputeScenario(
            artDAO,
            VoteOption.Neither
        );
        await commission.connect(buyer).raiseDispute(panelSize, votingDuration);

        const disputeId = await commission.disputeId();
        expect(await disputeId).to.be.greaterThan(0);
        //bug!
        await expect(artDAO.selectJurors(disputeId, votingDuration)).to.be.revertedWith("Not enough eligible holders");

       // const jurors = await artDAO.getJurors(disputeId);
       expect(artDAO.getJurors(disputeId)).to.be.revertedWith("");
       
        //expect(await jurors).to.exist;

    });
//------------------------------------------------------------------------------------------------------
//BUG//
    it("Evil Juror", async () => {
        const artDAO = await setupNewDAO();
        const EvilJuror = await ethers.getContractFactory("EvilJuror");
        const eviljuror = await EvilJuror.deploy(artDAO, {value: 10000});
        await artDAO.mint();
        await eviljuror.makebid(4);
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(4);
        expect(await artDAO.balanceOf(await eviljuror.getAddress())).to.equal(1);

       panelSize = 3;
       let evil = false;
      
        const { disputeId, jurors } = await DisputeNoVotes(artDAO);
    
        for (const jurorAddr of jurors) {
            if (jurorAddr != await eviljuror.getAddress()) {
            const juror = await ethers.getSigner(jurorAddr);
            await artDAO.connect(juror).vote(disputeId, VoteOption.Neither);
            } else {
                evil = true;
                await eviljuror.justvote(disputeId);
            }
        }

        //each vote individually- if contract use special function instead of normal
        //see if can resolve

        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
       // expect(await commission.progress()).to.equal(4);
        //expect(await nft.ownerOf(1)).to.equal(artist.address);

        //evil juror reject juror payout, trap dispute in limbo
        if (evil) {
        await expect(artDAO.resolveDispute(disputeId)).to.be.revertedWith("i'm evil");
        }
    });
//------------------------------------------------------------------------------------------------------------------------
//BUG//
    it("Evil Bidder", async () => {
        const artDAO = await setupNewDAO();
        const EvilJuror = await ethers.getContractFactory("EvilJuror");
        const eviljuror = await EvilJuror.deploy(artDAO, {value: 10000});

        await artDAO.mint();

        await eviljuror.makebid(4);

        await expect(artDAO
            .connect(holder1)
            .bid(4, { value: ethers.parseEther("0.05") })).to.be.revertedWith("i'm evil");
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(4);
        expect(await artDAO.balanceOf(await eviljuror.getAddress())).to.equal(1);

        //evil bidder reject ether, nobody else can outbid
    });

//------------------------------------------------------------------------------------------------------------------------
    //TODO
    //multiple votes, different types, majority in favor
    it("popular proposal gets passed", async () => {
        const artDAO = await setupNewDAO();
        await artDAO.mint();

        await artDAO
            .connect(holder2)
            .bid(4, { value: ethers.parseEther("0.01") });
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(4);
        const holders = [holder1, holder2, holder3, holder4];
        //const oldbal = await holder1.getBalance([ blockTag = "latest" ]);
       const propid =  await artDAO
            .connect(holder1)
            .createProposal(holder1, 100); 
        for (holder of holders) {
           if (holder == holder4) {
            await artDAO
            .connect(holder)
            .voteProposal(1n, false); 
           } else{ 
            await artDAO
            .connect(holder)
            .voteProposal(1n, true); 
        //expect(true).to.equal(false);
           }
        }
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        expect(await artDAO.executeProposal(1n)).to.emit(artDAO, "ProposalExecuted" );
        
        
    });
    //multiple votes, different types, majority against
    it("unpopular proposal does not get passed", async () => {
         const artDAO = await setupNewDAO();
        await artDAO.mint();

        await artDAO
            .connect(holder2)
            .bid(4, { value: ethers.parseEther("0.01") });
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        await artDAO.settleAuction(4);
        const holders = [holder1, holder2, holder3, holder4];
        //const oldbal = await holder1.getBalance([ blockTag = "latest" ]);
       const propid =  await artDAO
            .connect(holder1)
            .createProposal(holder1, 100); 
        for (holder of holders) {
           if (holder == holder4) {
            await artDAO
            .connect(holder)
            .voteProposal(1n, true); 
           } else{ 
            await artDAO
            .connect(holder)
            .voteProposal(1n, false); 
        //expect(true).to.equal(false);
           }
        }
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
        expect(artDAO.executeProposal(1n)).to.be.revertedWith("Insufficient support");
        
    });

    //voting process with extensive checks on juror values
    it("has expected juror values throughout voting", async () => {

    });
    //checks dispute that ends with no votes
    it("survives dispute with no votes", async () => {
          const artDAO = await setupNewDAO();
       
        panelSize = 3;
      
        const { disputeId, jurors } = await DisputeNoVotes(artDAO);

        //each vote individually- if contract use special function instead of normal
        //see if can resolve
        await network.provider.send("evm_increaseTime", [7 * 86400 + 1]);
        await network.provider.send("evm_mine");
       // expect(await commission.progress()).to.equal(4);
        //expect(await nft.ownerOf(1)).to.equal(artist.address);

        //evil juror reject juror payout, trap dispute in limbo
   
        await expect(artDAO.resolveDispute(disputeId)).to.not.be.reverted;
        
    });
    //checks close votes
   // it("gives correct results voting", async () => {});
    //checks if artist can get on jury
    it("doesn't let artist on jury", async () => {});
    //checks if buyer can get on jury
    it("doesn't let buyer on jury", async () => {});
    //check dispute resolution where buyer reverts on receive
    it("reverts on dispute with evil buyer", async () => {
        const artDAO = await setupNewDAO();
        const EvilJuror = await ethers.getContractFactory("EvilBuyer");
        const evilBuyer = await EvilJuror.deploy();
        const ERC721Mock = await ethers.getContractFactory("ERC721Mock");
        const nft = await ERC721Mock.deploy("Test Art", "ART");
        await nft.mint(artist.address, 1);

        const { price, upfront, insurance, timeframe } = await defaultParams();
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
             await evilBuyer.confirm(commission.target);
             
             // fund
             const artistFund = insurance / 2n;
             const buyerFund = insurance / 2n + upfront;
             await evilBuyer.fund(commission.target, { value: buyerFund });
             await commission.connect(artist).fund({ value: artistFund });

        await network.provider.send("evm_increaseTime", [7 * 86400]);
        await network.provider.send("evm_mine"); 

        await commission.connect(artist).raiseDispute(panelSize, votingDuration);

        const disputeId = await commission.disputeId();
        await artDAO.selectJurors(disputeId, votingDuration);

        const jurors = await artDAO.getJurors(disputeId);

        for (const jurorAddr of jurors) {
            const juror = await ethers.getSigner(jurorAddr);
            await artDAO.connect(juror).vote(disputeId, 3);
        }

        await network.provider.send("evm_increaseTime", [votingDuration + 1]);
        await network.provider.send("evm_mine");

        await expect(artDAO.resolveDispute(disputeId)).to.be.reverted;
        //something weird going on here
        
    });
    //check dispute resolution where sender revert on receive
    it("reverts on dispute with evil artist", async () => {});
});
