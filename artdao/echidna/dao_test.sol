pragma solidity ^0.8.0;

import 'art_dao.sol';

contract dao_test {
    art_dao level;

    constructor() public payable { 
        level = art_dao();
    }
  
    //
    
    function test_hacked() public returns (bool) {
        //To beat the level you needed to become the owner and withdraw the balance
        assert(!(level.owner() == address(this) && address(level).balance == 0));
    }

    function testMint() public {
        uint256 oldid = level.nextTokenId();
        level.mint();
        assert(level.nextTokenId() == oldid - 1);
        assert(level.ownerOf(oldid) == address(level));
    }

    function testBid() {}

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
}
