pragma solidity ^0.6.0;

import 'art_commission.sol';

contract art_test {
    art_commission level;

    constructor() public payable { 
        level = art_commission();
    }
  
    //
    
    function test_hacked() public returns (bool) {
        //To beat the level you needed to become the owner and withdraw the balance
        assert(!(level.owner() == address(this) && address(level).balance == 0));
    }

    receive() external payable {}
}
