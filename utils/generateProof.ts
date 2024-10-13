import path from "path";
import { plonk } from "snarkjs";

const fs = require("fs");

const wc = require("../circuits/LessThen100_js/witness_calculator.js");
const wasm = path.join(
  __dirname,
  "../circuits/LessThen100_js/LessThen100.wasm"
);
const zkey = path.join(__dirname, "../circuits/proving_key.zkey");
const INPUTS_FILE = "/tmp/inputs";
const WITNESS_FILE = "/tmp/witness";

const generateWitness = async (inputs) => {
  const buffer = fs.readFileSync(wasm);
  const witnessCalculator = await wc(buffer);
  const buff = await witnessCalculator.calculateWTNSBin(inputs, 0);
  fs.writeFileSync(WITNESS_FILE, buff);
};

const main = async (input: number) => {
  const inputSignals = { in: input }; // replace with your signals
  await generateWitness(inputSignals);
  const { proof, publicSignals } = await plonk.prove(zkey, WITNESS_FILE);
  return { proof, publicSignals };
};

export const generateProof = async (input: number) => {
  const { proof, publicSignals } = await main(input);
  // const wasmPath = path.join(__dirname, "../LessThen100_js/LessThen100.wasm");
  // const provingKeyPath = path.join(__dirname, "../proving_key.zkey");
  // const { proof, publicSignals } = await plonk.fullProve(
  //   { in: input },
  //   wasmPath,
  //   provingKeyPath
  // );
  const calldataBlob = await plonk.exportSolidityCallData(proof, publicSignals);
  const calldata = calldataBlob.split("][");

  // console.log(
  //   "calldata",
  //   calldata[0].slice(1).split(",").map(JSON.parse),
  //   calldata[1]
  //     .slice(0, calldata[1].length - 1)
  //     .split(",")
  //     .map(JSON.parse)
  // );
  // const proveRes = await groth16.fullProve(
  //   { in: input },
  //   path.join(__dirname, "../LessThen100_js/LessThen100.wasm"),
  //   path.join(__dirname, "../circuit_final.zkey")
  // );
  // console.log("proveRes", proveRes);
  // const res = await groth16.verify(
  //   VerificationKey,
  //   proveRes.publicSignals,
  //   proveRes.proof
  // );

  // if (res) {
  //   const proof = convertCallData(
  //     await groth16.exportSolidityCallData(
  //       proveRes.proof,
  //       proveRes.publicSignals
  //     )
  //   );

  //   return {
  //     proof: proof,
  //     publicSignals: proveRes.publicSignals,
  //   };
  // } else {
  //   console.error("calculateProof verify faild.");
  //   return null;
  // }
  return {
    proof: calldata[0].slice(1).split(",").map(JSON.parse),
    publicSignals: calldata[1]
      .slice(0, calldata[1].length - 1)
      .split(",")
      .map(JSON.parse),
  };
};

// export function convertCallData(calldata: string) {
//   const argv = calldata.replace(/["[\]\s]/g, "").split(",");

//   const a = [argv[0], argv[1]];
//   const b = [
//     [argv[2], argv[3]],
//     [argv[4], argv[5]],
//   ];
//   const c = [argv[6], argv[7]];

//   let input = [];
//   // const input = [argv[8], argv[9]];
//   for (let i = 8; i < argv.length; i++) {
//     input.push(argv[i] as never);
//   }

//   return { a, b, c, input };
// }
