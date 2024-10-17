// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IOracleCallback} from "../interfaces/IOracleCallback.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockOracleCallback is IOracleCallback, Ownable {
    address public oracle;

    mapping(uint256 => bool) public jobResults;

    event OracleUpdated(address indexed privious, address indexed current);

    constructor(address _oracle) Ownable(msg.sender) {
        oracle = _oracle;
    }

    function updateOracle(address _oracle) external onlyOwner {
        address privious = oracle;
        oracle = _oracle;
        emit OracleUpdated(privious, _oracle);
    }

    function receiveResultCallback(uint256 key, bytes calldata data) public {
        require(msg.sender == oracle);

        bool result = abi.decode(data, (bool));
        jobResults[key] = result;
    }
}
