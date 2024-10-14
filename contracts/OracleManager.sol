// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IOracle} from "./interfaces/IOracle.sol";

contract Manager is Ownable {
    mapping(uint256 => address) oracles;

    event OracleUpdated(uint256 indexed id, address previous, address current);
    event OracleDeleted(uint256 indexed id, address oracle);

    constructor() Ownable(msg.sender) {}

    // submit a request
    function submit(uint256 id, bytes calldata data) public {
        address oracle = oracles[id];
        IOracle(oracle).request(data);
    }

    // submit a result
    function set(uint256 id, bytes[] calldata data) public {
        address oracle = oracles[id];
        IOracle(oracle).multiReceiveResult(data);
    }

    function updateOracle(uint256 id, address oracle) external onlyOwner {
        address previous = oracles[id];
        oracles[id] = oracle;
        emit OracleUpdated(id, previous, oracle);
    }

    function deleteOracle(uint256 id, address oracle) external onlyOwner {
        require(oracles[id] == oracle);

        delete oracles[id];
        emit OracleDeleted(id, oracle);
    }
}
