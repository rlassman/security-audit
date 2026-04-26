pragma solidity ^0.8.0;

import 'art_commission.sol';
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

// deploy fake nft to test certain functions??

// inherit for direct access to functions
contract art_test is art_commission {
    // using fake addresses for now
    constructor() art_commission(
        address(0x1), // buyer
        address(0x2), // artist
        0.02 ether,   // insuranceAmount (>= 0.0075 ETH)
        1 ether,      // price
        0.1 ether,    // upfrontPayment
        7 days,       // timeframe
        address(0x3)  // DAO
    ) payable {}
  
    // full disclosure: I'm writing really random things

    // upfront payment gets locked
    // once complete, contract shouldn't have any ETH because it should theoretically be returned
    function echidna_locked_payment() public view returns (bool) {
        if (progress == State.Completed) {
            return address(this).balance == 0;
        }
        return true;
    }

    // good faith release can not be called
    function force_state_to_funded() public {
        // manually bypass setup
        progress = State.Funded;
        
        // simulate money in the contract
        payable(address(this)).transfer(upfrontPayment + insuranceAmount);
    }

    function test_good_faith_release() public {
        if (progress == State.Funded) {
            goodFaithRelease();
            assert(progress == State.Completed);
        }
    }

    receive() external payable {}
}
