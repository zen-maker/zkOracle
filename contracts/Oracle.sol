// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IOracle} from "./interfaces/IOracle.sol";
import {IOracleCallback} from "./interfaces/IOracleCallback.sol";
import {PlonkVerifier} from "./Verifier.sol";

contract Oracle is IOracle {
    /// @inheritdoc IOracle
    uint256 public id;

    /// @inheritdoc IOracle
    PlonkVerifier public verifier;

    /// @inheritdoc IOracle
    mapping(uint256 => Job) public jobs;

    /// @inheritdoc IOracle
    mapping(uint256 => NumberStatus) public results;

    // 校验zk证明的合约地址
    address private keeper;

    modifier OnlyKeeper() {
        if (msg.sender != keeper) {
            revert NotKeeper();
        }
        _;
    }

    constructor(uint256 _id, address _verifier, address _keeper) {
        id = _id;
        verifier = PlonkVerifier(_verifier);
        keeper = _keeper;
    }

    /// @inheritdoc IOracle
    function checkNumber(uint256 number) external view returns (NumberStatus) {
        return results[number];
    }

    /// @inheritdoc IOracle
    function request(bytes calldata data) public {
        (uint256 number, uint256 deadline, address recipient) = abi.decode(
            data,
            (uint256, uint256, address)
        );

        require(deadline > block.timestamp);

        if (isNumberSet(number)) {
            revert NumberAlreadySet();
        }

        Job storage job = jobs[number];

        if (job.status == Status.CREATED) {
            revert JobInProgress();
        }

        job.owner = msg.sender;
        job.recipient = recipient;
        job.number = number;
        job.status = Status.CREATED;
        job.deadline = deadline;

        emit JobRequest(number, deadline);
    }

    /// @inheritdoc IOracle
    function deleteRequest(uint256 jobId) public returns (bool) {
        Job storage job = jobs[jobId];

        if (
            job.owner == msg.sender &&
            job.deadline > block.timestamp &&
            job.status == Status.CREATED
        ) {
            delete jobs[jobId];
            emit JobDeleted(jobId);
            return true;
        }
        return false;
    }

    /// @inheritdoc IOracle
    function receiveResult(
        uint256[24] memory _proof,
        uint256[2] memory _pubSignals
    ) public returns (bool) {
        uint256 input = _pubSignals[1];
        Job storage job = jobs[input];

        if (job.status != Status.CREATED) {
            revert JobNotInProgress();
        }

        bool success = verifier.verifyProof(_proof, _pubSignals);

        if (success && job.deadline >= block.timestamp) {
            bool result = _pubSignals[0] > 0;
            _setResult(input, result);
            job.status = Status.COMPLETED;

            _sendResult(job.recipient, input, abi.encode(result));

            emit JobCompleted(input, true);
            return true;
        }
        return false;
    }

    /// @inheritdoc IOracle
    function setJobToFail(uint256 number) public OnlyKeeper {
        Job storage job = jobs[number];
        if (job.deadline < block.timestamp && job.status == Status.CREATED) {
            job.status = Status.FAILED;
            emit JobCompleted(number, false);
        }
    }

    /// @inheritdoc IOracle
    function multiReceiveResult(
        bytes[] calldata data
    ) public returns (bool[] memory multiResults) {
        multiResults = new bool[](data.length);
        for (uint i = 0; i < data.length; i++) {
            (uint256[24] memory _proof, uint256[2] memory _pubSignals) = abi
                .decode(data[i], (uint256[24], uint256[2]));

            bool success = receiveResult(_proof, _pubSignals);
            multiResults[i] = success;
        }
    }

    /// @inheritdoc IOracle
    function isNumberSet(uint256 key) public view returns (bool) {
        return results[key] != NumberStatus.NOT_SET;
    }

    function _setResult(uint256 key, bool value) internal {
        if (value) {
            results[key] = NumberStatus.IS_TRUE;
        } else {
            results[key] = NumberStatus.IS_FALSE;
        }
    }

    /// @notice Send result to user callback address. Errors will be caught and events emitted.
    /// @dev Errors are not reverted, but events are used instead, so that the results can be saved for others to query.
    function _sendResult(
        address recipient,
        uint256 key,
        bytes memory data
    ) internal {
        uint256 size;
        assembly {
            size := extcodesize(recipient)
        }
        if (size > 0) {
            try IOracleCallback(recipient).receiveResultCallback(key, data) {
                emit JobResultSent(key, recipient, data);
            } catch {
                //
            }
        }
    }
}
