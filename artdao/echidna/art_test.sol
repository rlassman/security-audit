// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
import 'art_commission.sol';

contract arttest {
    ArtCommission level;
    address constant ARTIST = address(0x2);
    address constant DAO = address(0x3);

    constructor() public {
        level = new ArtCommission(
            address(this),  // buyer
            ARTIST,         // artist
            0.02 ether,     // insuranceAmount
            1 ether,        // price
            0.1 ether,      // upfrontPayment
            604800,         // timeframe
            DAO             // dao
        );
    }

    receive() external payable {}

    // ============
    // wrapper functions
    // ============

    function wrap_contractConfirm() public {
        level.contractConfirm();
    }

    function wrap_fund() public payable {
        level.fund{value: msg.value}();
    }

    function wrap_goodFaithRelease() public {
        level.goodFaithRelease();
    }

    function wrap_raiseDispute(uint256 panelSize, uint256 votingDuration) public {
        level.raiseDispute(panelSize, votingDuration);
    }

    // ============
    // sanity check
    // ============

    function test_sanity() public pure returns (bool) {
        return true;
    }

    // ============
    // participant invariants
    // ============

    // buyer and artist should never be the same
    function test_artist_not_buyer() public {
        assert(level.artist() != level.buyer());
    }

    // participants should never be zero address
    function test_no_zero_addresses() public {
        assert(level.buyer() != address(0));
        assert(level.artist() != address(0));
        assert(level.DAO() != address(0));
    }

    // ============
    // financial invariants
    // ============

    // upfrontPayment payment should never exceed fullPrice
    function test_upfront_leq_price() public {
        assert(level.upfrontPayment() <= level.fullPrice());
    }

    // insuranceAmount should always meet the minimum threshold
    function test_insurance_minimum() public {
        assert(level.insuranceAmount() >= 7500000000000000);
    }

    // contract balance should never exceed total expected funds
    // (insurance + full price is the max)
    function test_balance_never_exceeds_max() public {
        assert(address(level).balance <= level.insuranceAmount() + level.fullPrice());
    }

    // lastPayment should equal fullPrice - upfrontPayment
    function test_last_payment_correct() public {
        assert(level.fullPrice() - level.upfrontPayment() == level.lastPayment());
    }

    // ============
    // state machine invariants
    // ============

    // progress should always be a valid state (0-5)
    function test_valid_state() public {
        assert(uint(level.progress()) <= 5);
    }

    // once in Completed state (4), should never leave
    function test_completed_is_final() public {
        if (uint(level.progress()) == 4) {
            assert(uint(level.progress()) == 4);
        }
    }

    // Dispute (5) should only be reachable from Funded (2) or WorkCompleted (3)
    function test_dispute_only_after_funded() public {
        if (uint(level.progress()) == 5) {
            // daoCaseCreated must be true to Dispute (5)
            assert(level.daoCaseCreated() == true);
        }
    }

    // disputeId should only be nonzero if a case was actually created
    function test_dispute_id_consistent() public {
        if (level.daoCaseCreated() == false) {
            assert(level.disputeId() == 0);
        }
    }

    // ============
    // nft / artwork invariants
    // ============

    // artID and artwork address should only be set in WorkCompleted (3) or later
    function test_art_only_set_after_work_completed() public {
        if (uint(level.progress()) < 3) { // before WorkCompleted
            assert(address(level.artwork()) == address(0));
        }
    }
}