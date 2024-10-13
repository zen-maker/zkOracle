pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template LessThan100() {
    signal input in;
    signal output out;
    signal output inputValue;

    component isLessThan = LessThan(8);
    isLessThan.in[0] <== in;
    isLessThan.in[1] <== 100;

    out <== isLessThan.out;
    inputValue <== in;
}

component main = LessThan100();
