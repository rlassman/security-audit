pragma solidity ^0.8.0;

interface IERC721Mintable {
    function mint(address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
}

interface ICommission {
    function acceptArt(address nft, uint256 tokenId) external;
}

contract EvilArtist {
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

    function acceptArt(address commission, address nft, uint256 tokenId) external {
        (bool success, ) = commission.call(
            abi.encodeWithSignature(
                "acceptArt(address,uint256)",
                nft,
                tokenId
            )
        );
        require(success, "accept failed");
    }

    function submitArt(address commission, address nft, uint256 tokenId) external {
        // mint NFT to this contract
        IERC721Mintable(nft).mint(address(this), tokenId);

        // approve commission to transfer it
        IERC721Mintable(nft).approve(commission, tokenId);

        // call acceptArt as evil contract
        ICommission(commission).acceptArt(nft, tokenId);
    }
}