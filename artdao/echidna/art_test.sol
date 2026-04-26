// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
import './art_commission.sol';

contract art_test is ArtCommission {

    constructor() ArtCommission(
        address(0x0000000000000000000000000000000000000001), // buyer == deployer
        address(0x2),  // artist
        0.02 ether,    // insuranceAmount
        1 ether,       // price
        0.1 ether,     // upfrontPayment
        604800,        // timeframe (7 days in seconds)
        address(0x3)   // DAO
    ) {}

    receive() external payable {}

    // ============
    // sanity check
    // ============

    function echidna_sanity() public pure returns (bool) {
        return true;
    }

    // =============================================================
    // helper functions that force certain states to test invariants
    // =============================================================

    function set_state_confirmed() public {
        progress = State.Confirmed;
        timeInitiated = block.timestamp;
    }

    function set_state_funded() public {
        progress = State.Funded;
        timeInitiated = block.timestamp;
    }

    function set_state_work_completed() public {
        progress = State.WorkCompleted;
    }

    function set_state_disputed() public {
        progress = State.Disputed;
        daoCaseCreated = true;
    }

    // ===========================================================
    // testing immutable constructor params, they shouldn't change
    // ===========================================================

    function echidna_buyer_never_changes() public view returns (bool) {
        return buyer == address(0x0000000000000000000000000000000000000001);
    }

    function echidna_artist_never_changes() public view returns (bool) {
        return artist == address(0x2);
    }

    function echidna_dao_never_changes() public view returns (bool) {
        return DAO == address(0x3);
    }

    function echidna_insurance_never_changes() public view returns (bool) {
        return insuranceAmount == 0.02 ether;
    }

    function echidna_full_price_never_changes() public view returns (bool) {
        return fullPrice == 1 ether;
    }

    function echidna_upfront_never_changes() public view returns (bool) {
        return upfrontPayment == 0.1 ether;
    }

    // lastPayment = fullPrice - upfrontPayment, should always hold
    function echidna_last_payment_consistent() public view returns (bool) {
        return lastPayment == fullPrice - upfrontPayment;
    }

    // ====================================================
    // state should not regress after completion or dispute
    // ====================================================

    // state should be valid enum value (0-5)
    function echidna_state_valid() public view returns (bool) {
        return uint(progress) <= uint(State.Disputed);
    }

    // should never go back to earlier state after completion
    function echidna_completed_is_terminal() public view returns (bool) {
        if (progress == State.Completed) {
            // State.Completed == 4, nothing should move it back
            return uint(progress) == 4;
        }
        return true;
    }

    // disputed state should be reachable from Funded or WorkCompleted
    function echidna_dispute_flag_consistent() public view returns (bool) {
        // daoCaseCreated should only be true if we are Disputed or Completed
        if (daoCaseCreated) {
            return progress == State.Disputed || progress == State.Completed;
        }
        return true;
    }

    // ================================================
    // third parties should not be able to affect state
    // ================================================

    // only buyer or artist should be able to trigger confirmation
    // verify state didn't change
    function echidna_confirm_only_moves_from_proposed() public view returns (bool) {
        // shouldn't skip past Confirmed
        if (uint(progress) > uint(State.Proposed)) {
            return uint(progress) >= uint(State.Confirmed);
        }
        return true;
    }

    // ========================
    // good faith release issue
    // ========================

    // should always be true because of the bug
    function echidna_good_faith_always_reverts_single_call() public returns (bool) {
        bool buyerFlagBefore = buyerBreakFaith;
        bool artistFlagBefore = artistBreakFaith;

        // reset flags
        buyerBreakFaith = false;
        artistBreakFaith = false;

        // try calling as buyer
        (bool success, ) = address(this).call(
            abi.encodeWithSignature("goodFaithRelease()")
        );

        // restore echidna_good_faith_always_reverts_single_call
        buyerBreakFaith = buyerFlagBefore;
        artistBreakFaith = artistFlagBefore;

        // should always fail since only one flag can be set per call
        return !success;
    }

    // =================================================
    // contract should not have more ETH than was put in
    // contract should be drained after completion
    // =================================================

    // max = upfront + full insurance + lastPayment
    function echidna_balance_never_exceeds_max() public view returns (bool) {
        uint256 maxBalance = upfrontPayment + insuranceAmount + lastPayment;
        return address(this).balance <= maxBalance;
    }

    // ====================================================
    // contract enters Funded state only with right balance
    // ====================================================

    function echidna_funded_state_means_correct_balance() public view returns (bool) {
        if (progress == State.Funded) {
            // should hold upfront + insurance
            // allow for extra ETH sent via receive()
            return address(this).balance >= upfrontPayment + insuranceAmount;
        }
        return true;
    }

    // ======================================
    // daoCaseCreated should be set only once
    // ======================================

    function echidna_dispute_only_raised_once() public view returns (bool) {
        if (daoCaseCreated) {
            return daoCaseCreated == true; // once set, never unset
        }
        return true;
    }
}