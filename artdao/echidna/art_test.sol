pragma solidity ^0.6.0;

import 'art_commission.sol';

contract art_test {
    art_commission level;

    // deploy fake nft??
    // using fake addresses for now
    constructor() ArtCommission(
        address(0x1), // buyer
        address(0x2), // artist
        0.02 ether,   // insuranceAmount
        1 ether,      // price
        0.1 ether,    // upfrontPayment
        7 days,       // timeframe
        address(0x3)  // DAO
    ) payable {}

    function test_hacked() public returns (bool) {
        assert(!(level.owner() == address(this) && address(level).balance == 0));
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

    receive() external payable {}
}
