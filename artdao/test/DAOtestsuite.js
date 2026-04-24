const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { ethers, network } = require("hardhat");
const { expect } = require("chai");

//Notes on issues to check

//someobody could create impossible to resolve dispute,
//making it impossible to create a valid dispute for a commission

//payout jurors in loop- if one juror payout fails, entire resolution reverts
//makes it so dispute can never be resolved

//minor design note: could use smaller uints in structs. there are only like 2^3 ppl in the world I fear 

describe("art_DAO", function () {
    
})