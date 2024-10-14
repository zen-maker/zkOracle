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

  describe("User operate Jobs", function () {
    it("Should request a job correctly", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient, 1);
    });

    it("Should delete a job correctly", async function () {
      const { publicClient, Oracle, owner } = await loadFixture(
        deployContracts
      );
      await requestAJob(Oracle, publicClient, 1);

      expect(((await Oracle.read.jobs([1])) as any)[0]).to.equal(
        getAddress(owner.account.address)
      );

      const deleteHash = await Oracle.write.deleteRequest([1]);
      await publicClient.waitForTransactionReceipt({ hash: deleteHash });
      expect(((await Oracle.read.jobs([1])) as any)[0]).to.equal(zeroAddress);
    });
  });

  describe("Submit result", function () {
    it("Should set true when number is 99", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient, 99);

      const { proof, publicSignals } = await generateProof(99);

      const hash = await Oracle.write.receiveResult([proof, publicSignals]);
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await Oracle.read.checkNumber([99])).to.equal(
        NumberStatus.IS_TRUE
      );
    });

    it("Should set false when number is 101", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient, 101);
      const { proof, publicSignals } = await generateProof(101);

      const hash = await Oracle.write.receiveResult([proof, publicSignals]);
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await Oracle.read.checkNumber([101])).to.equal(
        NumberStatus.IS_FALSE
      );
    });

    it("The batch setting result should be successful", async function () {
      const { publicClient, Oracle } = await loadFixture(deployContracts);
      await requestAJob(Oracle, publicClient, 1);
      await requestAJob(Oracle, publicClient, 2);
      const { proof: proof_1, publicSignals: publicSignals_1 } =
        await generateProof(1);
      const { proof: proof_2, publicSignals: publicSignals_2 } =
        await generateProof(2);

      const calldata1 = encodeAbiParameters(
        [
          { type: "uint256[24]", name: "_proof" },
          { type: "uint256[2]", name: "publicSignals" },
        ],
        [proof_1.map(BigInt) as any, publicSignals_1.map(BigInt) as any]
      );
      const calldata2 = encodeAbiParameters(
        [
          { type: "uint256[24]", name: "_proof" },
          { type: "uint256[2]", name: "publicSignals" },
        ],
        [proof_2.map(BigInt) as any, publicSignals_2.map(BigInt) as any]
      );

      const hash = await Oracle.write.multiReceiveResult([
        [calldata1, calldata2],
      ]);
      await publicClient.waitForTransactionReceipt({ hash });

      expect(await Oracle.read.checkNumber([1])).to.equal(NumberStatus.IS_TRUE);
      expect(await Oracle.read.checkNumber([2])).to.equal(NumberStatus.IS_TRUE);
    });

    it("The state should not change when the verification proof is wrong", async function () {});
    it("When operating a completed job, you should revert JobNotInProgress", async function () {});
  });

  describe("Events", function () {});
  describe("Gas", function () {});
});
