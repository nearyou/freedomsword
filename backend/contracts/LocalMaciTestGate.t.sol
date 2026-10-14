// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {LocalMaciTestGate, MaciGateOnlyPolicy, IMaciSignup} from "./LocalMaciTestGate.sol";

interface VmGate {
    function prank(address) external;
    function chainId(uint256) external;
}

contract SignupTargetMock is IMaciSignup {
    MaciGateOnlyPolicy public policy;
    uint256 public signups;
    uint256 public lastX;

    constructor(MaciGateOnlyPolicy policy_) {
        policy = policy_;
    }

    function signUp(PublicKey memory publicKey, bytes memory policyData) external {
        policy.enforce(msg.sender, policyData);
        signups++;
        lastX = publicKey.x;
    }
}

contract LocalMaciTestGateTest {
    VmGate private constant vm = VmGate(address(uint160(uint256(keccak256("hevm cheat code")))));
    LocalMaciTestGate private gate;
    MaciGateOnlyPolicy private policy;
    SignupTargetMock private maci;

    function setUp() public {
        gate = new LocalMaciTestGate();
        policy = new MaciGateOnlyPolicy(address(gate));
        maci = new SignupTargetMock(policy);
        policy.setTarget(address(maci));
        gate.setMaci(address(maci));
    }

    function testLocalSignupUsesGateAndCannotRepeat() public {
        vm.prank(address(0xBEEF));
        gate.signUp(IMaciSignup.PublicKey(1, 2));
        require(maci.signups() == 1 && maci.lastX() == 1, "signup not forwarded");
        vm.prank(address(0xBEEF));
        try gate.signUp(IMaciSignup.PublicKey(3, 4)) {
            revert("duplicate signup accepted");
        } catch {}
        require(maci.signups() == 1, "duplicate changed state");
    }

    function testDirectSignupAndPolicyBypassFail() public {
        try maci.signUp(IMaciSignup.PublicKey(1, 2), "") {
            revert("direct MACI signup accepted");
        } catch {}
        try policy.enforce(address(gate), "") {
            revert("policy accepted unauthorized caller");
        } catch {}
        try gate.setMaci(address(this)) {
            revert("MACI target changed");
        } catch {}
    }

    function testCannotDeployOnPublicChain() public {
        vm.chainId(11155111);
        bool blocked;
        try new LocalMaciTestGate() {
            blocked = false;
        } catch {
            blocked = true;
        }
        require(blocked, "public-chain deployment accepted");
    }

    function testRejectsNonContractTarget() public {
        LocalMaciTestGate unconfigured = new LocalMaciTestGate();
        bool blocked;
        try unconfigured.setMaci(address(0xBEEF)) {
            blocked = false;
        } catch {
            blocked = true;
        }
        require(blocked && address(unconfigured.maci()) == address(0), "EOA target accepted");
    }
}
