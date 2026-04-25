pragma solidity ^0.6.0;

import 'art_commission.sol';

contract art_test {
    art_commission level;

    constructor() public payable { 
        level = art_commission();
    }
  
    // full disclosure: I'm writing really random things
    function test_contribute() external payable {
        level.contribute.value(msg.value)(); 
    }

    function test_withdraw() external  {
        level.withdraw();
    }

    function test_fallback() external payable {
        address(level).call.value(msg.value)(""); 
    }
    
    function test_hacked() public returns (bool) {
        //To beat the level you needed to become the owner and withdraw the balance
        assert(!(level.owner() == address(this) && address(level).balance == 0));
    }

    receive() external payable {}
}
