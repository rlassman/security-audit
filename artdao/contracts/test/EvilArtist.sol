pragma solidity ^0.8.0;

contract RejectETH {
    // reverts on any ETH transfer
    receive() external payable {
        revert("i'm evil");
    }
}