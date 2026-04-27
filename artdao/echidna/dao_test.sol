// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "art_dao.sol";
import "art_commission.sol";


contract dao_test {
    ArtDAO level;
    uint256 curtok;

    constructor() payable{ 
        level = new ArtDAO();
    }
  


    function testMint() public {
        uint256 oldid = level.nextTokenId();
        level.mint();
        assert(level.nextTokenId() == oldid - 1);
        curtok = oldid;
        assert(level.ownerOf(oldid) == address(level));
    }

    function testBid(uint256 val) public {
        uint256 oldbid = level.auctions[curtok].highestBid;
        bool shouldwin = val > level.auctions[curtok].highestBid;
        (bool sent, bytes memory data) = address(level).call(abi.encodeWithSignature("bid(256)", val));
        require(sent, "Failed to vote");
        assert(level.auctions[curtok].highestBid >= oldbid);
        if (shouldwin) {
            assert(level.auctions[curtok].highestBid == val);
        }
    }


    function testSettleAuction() public {
          address oldbid = level.auctions[curtok].highestBidder;
          level.settleAuction(curtok);
          if (oldbid != address(0)) {
            assert(level.tokenOwner(curtok) == oldbid);
          }

    }

    function testTransfer(address to) public {
        level.transfer(to, curtok);
        assert(level.tokenOwner(curtok) == to);
    }


    //function testBalanceOf() {}

   // function test ownerOf() {}

    //function testTreasuryBalance() {}

    function createCommission(address artist, uint128 insuranceAmount, uint256 price, uint256 upfrontPay, uint256 timeframe ) public{
        insuranceAmount += 7500000000000000;
        if (upfrontPay < price) {
            upfrontPay = price;
        }
        ArtCommission comm = new ArtCommission(address(this, artist, insuranceAmount, price, upfrontPay, timeframe, address(level)));
        
    }
/*
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
