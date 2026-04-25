pragma solidity ^0.6.0;

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

    receive() external payable {}
}
