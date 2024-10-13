import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, encodeAbiParameters, zeroAddress } from "viem";
import { generateProof } from "../utils/generateProof";

enum NumberStatus {
  NOT_SET,
  IS_FALSE,
  IS_TRUE,
}

describe("Oracle", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContracts() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const Verifier = await hre.viem.deployContract("PlonkVerifier" as never);
    const Oracle = await hre.viem.deployContract("Oracle" as never, [
      1,
      Verifier.address,
      owner.account.address,
    ]);

    const publicClient = await hre.viem.getPublicClient();

    return { Verifier, Oracle, owner, otherAccount, publicClient };
  }

  async function requestAJob(Oracle: any, publicClient: any, number = 101) {
    const ONE_WEEK_IN_SECS = 7 * 24 * 60 * 60;
    const deadline = BigInt((await time.latest()) + ONE_WEEK_IN_SECS);

    // request a job
    const requestHash = await Oracle.write.request([number, deadline]);
    await publicClient.waitForTransactionReceipt({ hash: requestHash });

    const job = (await Oracle.read.jobs([number])) as any;
    // status is created
    expect(job[2]).to.equal(1);
  }

  describe("Deployment", function () {
    it("Should set the right id and Verifier address", async function () {
      const { Verifier, Oracle } = await loadFixture(deployContracts);

      expect(await Oracle.read.verifier()).to.equal(
        getAddress(Verifier.address)
      );
    });
  });

  describe("Job operation", function () {
    it("Should operation job correctly", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient);

      // delete a job
      const deleteHash = await Oracle.write.deleteRequest([0]);
      await publicClient.waitForTransactionReceipt({ hash: deleteHash });
      expect(((await Oracle.read.jobs([0])) as any)[0]).to.equal(zeroAddress);
    });
  });

  describe("Verify", function () {
    it("Should set true when number is 99", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient, 99);

      const { proof, publicSignals } = await generateProof(99);

      const calldata = encodeAbiParameters(
        [
          { type: "uint256[24]", name: "_proof" },
          { type: "uint256[2]", name: "publicSignals" },
        ],
        [proof.map(BigInt) as any, publicSignals.map(BigInt) as any]
      );

      const hash = await Oracle.write.receiveResult([calldata]);
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await Oracle.read.checkNumber([99])).to.equal(
        NumberStatus.IS_TRUE
      );
    });

    it("Should set false when number is 101", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient, 101);
      const { proof, publicSignals } = await generateProof(101);

      const calldata = encodeAbiParameters(
        [
          { type: "uint256[24]", name: "_proof" },
          { type: "uint256[2]", name: "publicSignals" },
        ],
        [proof.map(BigInt) as any, publicSignals.map(BigInt) as any]
      );

      const hash = await Oracle.write.receiveResult([calldata]);
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await Oracle.read.checkNumber([101])).to.equal(
        NumberStatus.IS_FALSE
      );
    });
  });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployContracts);

  //       await expect(lock.write.withdraw()).to.be.rejectedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployContracts
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We retrieve the contract with a different account to send a transaction
  //       const lockAsOtherAccount = await hre.viem.getContractAt(
  //         "Lock",
  //         lock.address,
  //         { client: { wallet: otherAccount } }
  //       );
  //       await expect(lockAsOtherAccount.write.withdraw()).to.be.rejectedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(deployContracts);

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.write.withdraw()).to.be.fulfilled;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount, publicClient } =
  //         await loadFixture(deployContracts);

  //       await time.increaseTo(unlockTime);

  //       const hash = await lock.write.withdraw();
  //       await publicClient.waitForTransactionReceipt({ hash });

  //       // get the withdrawal events in the latest block
  //       const withdrawalEvents = await lock.getEvents.Withdrawal();
  //       expect(withdrawalEvents).to.have.lengthOf(1);
  //       expect(withdrawalEvents[0].args.amount).to.equal(lockedAmount);
  //     });
  //   });
  // });
});
