pragma solidity ^0.8.0;

contract RejectETH {
    // reverts on eth transfer when is juror
    receive() external payable {
        revert("i'm evil");
    }
}