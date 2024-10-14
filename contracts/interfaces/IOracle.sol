// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;
import {PlonkVerifier} from "../Verifier.sol";

interface IOracle {
    enum Status {
        PLACEHOLDER,
        CREATED,
        COMPLETED,
        FAILED
    }

    struct Job {
        address owner;
        uint256 number;
        Status status;
        uint256 deadline;
    }

    enum NumberStatus {
        NOT_SET,
        IS_FALSE,
        IS_TRUE
    }

    /// @notice Emitted when there is a job request
    /// @param number The number need to be computed off-chain which is job id too
    /// @param deadline The job deadline
    event JobRequest(uint256 indexed number, uint256 deadline);

    /// @notice Emitted when a job is deleted
    /// @param number The job id
    event JobDeleted(uint256 indexed number);

    /// @notice Emitted when a job is completed, whther success or fail
    /// @param number The job id
    event JobCompleted(uint256 indexed number, bool result);

    // use error for gas optimization
    /// @notice Reverted when the caller is not the keeper
    error NotKeeper();

    /// @notice Reverted when the number resulst has been set
    error NumberAlreadySet();

    /// @notice Reverted when requesting an in progress job
    error JobInProgress();

    /// @notice Reverted when setting an not-in-progress job
    error JobNotInProgress();

    // @notice Return the job template ID.
    function id() external view returns (uint256);

    // @notice Return Plonk Verifier address.
    function verifier() external view returns (PlonkVerifier);

    // @notice Return a number mapping job details
    function jobs(
        uint256
    )
        external
        view
        returns (
            address owner,
            uint256 number,
            Status status,
            uint256 deadline
        );

    /// @notice Return result of a number
    /// @return NumberStatus
    function results(uint256) external view returns (NumberStatus);

    /// @notice Check result of a number with all computed data
    /// @return NumberStatus
    function checkNumber(uint256 number) external view returns (NumberStatus);

    /// @notice User request a new job
    /// @param number The job id
    /// @param deadline The job deadline
    function request(uint256 number, uint256 deadline) external;

    /// @notice User delete a owned job.
    /// @param number The job id
    /// @return true if success, otherwise false
    function deleteRequest(uint256 number) external returns (bool);

    /// @notice Off-chain service submit a job result
    /// @dev By default, anyone can call this function, because the status and storage results can only be changed when the verification is passed.
    // As long as the proof is correct, anyone can change the status and storage results of the job.
    /// @param _proof The proofs
    /// @param _pubSignals The publick output signals of circuits
    /// @return true if success, otherwise false
    function receiveResult(
        uint256[24] memory _proof,
        uint256[2] memory _pubSignals
    ) external returns (bool);

    /// @notice Off-chain service batch submit job results
    /// @param data The result datas
    /// @return true if success, otherwise false
    function multiReceiveResult(
        bytes[] calldata data
    ) external returns (bool[] memory);

    /// @notice Authorized keeper set timed-out job to fail. This allows users to re-request tasks to avoid blocking.
    /// @param number The job id
    function setJobToFail(uint256 number) external;

    /// @notice Check if a number is set result
    /// @param number The job id
    function isNumberSet(uint256 number) external view returns (bool);
}
