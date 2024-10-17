// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleCallback {
    /// @notice The callback used by the user to receive the result
    /// @param key Job key
    /// @param data The encoded result data
    function receiveResultCallback(uint256 key, bytes calldata data) external;
}
