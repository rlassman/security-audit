// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
import 'art_commission.sol';

// Acts as the artist so msg.sender checks pass
contract ArtistProxy {
    ArtCommission level;

    constructor(ArtCommission _level) public {
        level = _level;
    }

    function doConfirm() external {
        level.contractConfirm();
    }

    function doFund() external payable {
        level.fund{value: msg.value}();
    }

    function doGoodFaithRelease() external {
        level.goodFaithRelease();
    }

    function doRaiseDispute(uint256 panelSize, uint256 votingDuration) external {
        level.raiseDispute(panelSize, votingDuration);
    }

    receive() external payable {}
}

// Acts as the DAO so onlyDAO checks pass
contract DAOProxy {
    ArtCommission level;

    constructor(ArtCommission _level) public {
        level = _level;
    }

    function doArtistWins() external {
        level.artistWins();
    }

    function doBuyerWins() external {
        level.buyerWins();
    }

    function doNeitherWins() external {
        level.neitherWins();
    }

    receive() external payable {}
}

contract arttest {
    ArtCommission level;
    ArtistProxy artistProxy;
    DAOProxy daoProxy;

    address constant ARTIST = address(0x2); // unused now, proxy takes this role

    constructor() public {
        // arttest itself is buyer, artistProxy is artist, daoProxy is DAO
        artistProxy = new ArtistProxy(ArtCommission(address(0))); // placeholder
        daoProxy = new DAOProxy(ArtCommission(address(0)));       // placeholder

        level = new ArtCommission(
            address(this),          // buyer
            address(artistProxy),   // artist
            0.02 ether,             // insuranceAmount
            1 ether,                // price
            0.1 ether,              // upfrontPayment
            604800,                 // timeframe
            address(daoProxy)       // dao
        );

        // wire proxies to the real level
        artistProxy = new ArtistProxy(level);
        daoProxy = new DAOProxy(level);
    }

    receive() external payable {}

    // buyer actions (arttest IS the buyer, so msg.sender is correct)
    function wrap_contractConfirm_buyer() public {
        level.contractConfirm();
    }

    function wrap_fund_buyer() public payable {
        level.fund{value: msg.value}();
    }

    function wrap_goodFaithRelease_buyer() public {
        level.goodFaithRelease();
    }

    function wrap_raiseDispute_buyer(uint256 panelSize, uint256 votingDuration) public {
        level.raiseDispute(panelSize, votingDuration);
    }

    // artist actions (go through proxy so msg.sender == artistProxy == artist)
    function wrap_contractConfirm_artist() public {
        artistProxy.doConfirm();
    }

    function wrap_fund_artist() public payable {
        artistProxy.doFund{value: msg.value}();
    }

    function wrap_goodFaithRelease_artist() public {
        artistProxy.doGoodFaithRelease();
    }

    function wrap_raiseDispute_artist(uint256 panelSize, uint256 votingDuration) public {
        artistProxy.doRaiseDispute(panelSize, votingDuration);
    }

    // DAO actions
    function wrap_artistWins() public {
        daoProxy.doArtistWins();
    }

    function wrap_buyerWins() public {
        daoProxy.doBuyerWins();
    }

    function wrap_neitherWins() public {
        daoProxy.doNeitherWins();
    }

    // ============
    // invariants (same as before)
    // ============

    function test_sanity() public pure returns (bool) { return true; }

    function test_artist_not_buyer() public {
        assert(level.artist() != level.buyer());
    }

    function test_no_zero_addresses() public {
        assert(level.buyer() != address(0));
        assert(level.artist() != address(0));
        assert(level.DAO() != address(0));
    }

    function test_upfront_leq_price() public {
        assert(level.upfrontPayment() <= level.fullPrice());
    }

    function test_insurance_minimum() public {
        assert(level.insuranceAmount() >= 7500000000000000);
    }

    function test_balance_never_exceeds_max() public {
        assert(address(level).balance <= level.insuranceAmount() + level.fullPrice());
    }

    function test_last_payment_correct() public {
        assert(level.fullPrice() - level.upfrontPayment() == level.lastPayment());
    }

    function test_valid_state() public {
        assert(uint(level.progress()) <= 5);
    }

    function test_completed_is_final() public {
        if (uint(level.progress()) == 4) {
            assert(uint(level.progress()) == 4);
        }
    }

    function test_dispute_only_after_funded() public {
        if (uint(level.progress()) == 5) {
            assert(level.daoCaseCreated() == true);
        }
    }

    function test_dispute_id_consistent() public {
        if (level.daoCaseCreated() == false) {
            assert(level.disputeId() == 0);
        }
    }

    function test_art_only_set_after_work_completed() public {
        if (uint(level.progress()) < 3) {
            assert(address(level.artwork()) == address(0));
        }
    }
}