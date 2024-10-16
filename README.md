# Overview

This contract is designed to bridge on-chain activities with off-chain compute workloads.

Users can request tasks on the chain and notify off-chain services to perform computations. Off-chain services submit computation results through zk-SNARK proofs and store data after verification on the chain.

# Main architecture

## Job Oracle contract

### request

1. User request a new job, emit an event.
2. The off-chain service responds to the event and starts computing.

### receiveResult

The off-chain service submit a job result. If the zk-SNARK verification is successful and there is no timeout, update the task status, save the result, and trigger the event.

If the user sets a callback address, the result will be sent to this address.

Off-chain services can submit tasks in batches.

### setJobToFail

The keeper is authorized to set timed-out job to fail. This allows users to re-request tasks to avoid blocking.

### deleteRequest

Users can delete their own ongoing jobs, trigger events. The off-chain service listening to the event cancels the calculation and saves compute resources.

## Oracle manager contract

Because there may be many oracle templates, a management contract is needed as a unified entry and exit.

### submit

User submit a request to a oracle with data.

### set

Off-chain service submit a result to a oracle with data.

# Develop

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```
