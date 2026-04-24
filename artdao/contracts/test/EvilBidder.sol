pragma solidity ^0.8.0;

contract RejectETH {
    // reverts on eth transfer when is juror
    address owner;
    
    constructor() {
        owner = msg.sender;
    }

    receive() external payable {
        revert("Your Tokens shall all be mine");
    }
}