pragma solidity ^0.8.0;

contract EvilBuyer {

    // reverts on any ETH transfer
    receive() external payable {
        revert("i'm evil");
        //while(true){} (caused revert without a reason)
    }
    fallback() external payable {
        revert("i'm evil");
    }

    function sendETH(address payable to) external payable {
        (bool success, ) = to.call{value: msg.value}("");
        require(success, "Send failed");
    }

    function deposit() external payable {}

    /* need wrappers to bypass onlyParties modifier */

    function confirm(address commission) external {
        (bool success, ) = commission.call(
            abi.encodeWithSignature("contractConfirm()")
        );
        require(success, "confirm failed");
    }

    function fund(address commission) external payable {
        (bool success, ) = commission.call{value: msg.value}(
            abi.encodeWithSignature("fund()")
        );
        require(success, "fund failed");
    }

    function payInFullAndRelease(address commission) external payable {
        (bool success, ) = commission.call{value: msg.value}(
            abi.encodeWithSignature("payInFullAndRelease()")
        );
        require(success, "pay failed");
    }

}