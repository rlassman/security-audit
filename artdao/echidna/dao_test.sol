// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "art_dao.sol";


contract dao_test {
    ArtDAO level;
    uint256 curtok;

    constructor() payable{ 
        level = new ArtDAO();
    }
  
    //


    function testMint() public {
        uint256 oldid = level.nextTokenId();
        level.mint();
        assert(level.nextTokenId() == oldid - 1);
        curtok = oldid;
        assert(level.ownerOf(oldid) == address(level));
    }

    function testBid(uint256 val) public {
        uint256 oldbid = level.auctions[curtok].highestBid;
        bool shouldwin = val > level.auctions[curtok].highestBid
        level.bid(curtok, {value: val});
        assert(level.auctions[curtok].highestBid >= oldbid);
        if (shouldwin) {
            assert(level.auctions[curtok].highestBid == val);
        }
    }
/*
    function testSettleAuction() {}

    function testTransfer() {}

    function testBalanceOf() {}

    function test ownerOf() {}

    function testTreasuryBalance() {}

    function testCreateDisputeCase() {}

    function testSelectJurors() {}

    function testVote() {}

    function testResolveDispute() {}

    function testGetJurors() {}

    function testGetVoteCounts() {}

    function testGetJurorVote() {}

    function testGetAllHolders() {}

    function testCreateProposal() {}

    function testVoteProposal() {}

    function testExecuteProposal() {}

    function testGetProposal() {}

    receive() external payable {}
    */
}
