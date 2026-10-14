// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RarimoMaciGate, IRarimoRegistry, IRarimoTD3Verifier} from "./RarimoMaciGate.sol";
import {IMaciSignup} from "./LocalMaciTestGate.sol";

interface VmRarimo {
    function warp(uint256) external;
}

contract RarimoRegistryMock is IRarimoRegistry {
    bool public valid = true;
    function setValid(bool value) external { valid = value; }
    function isRootValid(bytes32) external view returns (bool) { return valid; }
}

contract RarimoVerifierMock is IRarimoTD3Verifier {
    bool public valid = true;
    function setValid(bool value) external { valid = value; }
    function verifyProof(uint256[2] calldata, uint256[2][2] calldata,
        uint256[2] calldata, uint256[] calldata signals) external view returns (bool) {
        return valid && signals.length == 23;
    }
}

contract RarimoMaciTargetMock is IMaciSignup {
    uint256 public signups;
    function signUp(PublicKey memory, bytes memory) external { signups++; }
}

contract RarimoMaciGateTest {
    VmRarimo private constant vm = VmRarimo(address(uint160(uint256(keccak256("hevm cheat code")))));
    RarimoRegistryMock private registry;
    RarimoVerifierMock private verifier;
    RarimoMaciTargetMock private target;
    RarimoMaciGate private gate;
    bytes32 private constant ACCOUNT = bytes32(uint256(123));
    uint256 private constant TODAY = 1791979200; // 2026-10-14 12:00 UTC

    function setUp() public {
        vm.warp(TODAY);
        registry = new RarimoRegistryMock();
        verifier = new RarimoVerifierMock();
        target = new RarimoMaciTargetMock();
        gate = new RarimoMaciGate(address(registry), address(verifier), 77, TODAY + 1 days);
        gate.setMaci(address(target));
    }

    function _signals(IMaciSignup.PublicKey memory key) private view returns (uint256[23] memory s) {
        s[0] = 42;
        s[6] = gate.UKR();
        s[9] = 77;
        s[10] = gate.eventData(key, ACCOUNT);
        s[11] = 123;
        s[12] = gate.SELECTOR();
        s[13] = 0x323631303134; // 261014
        s[17] = 1;
        s[18] = 0x303030303030;
        s[19] = 0x303831303135; // 081015, strict upper bound for 18 today
        s[20] = s[13];
        s[21] = 0x303030303030;
    }

    function _register(IMaciSignup.PublicKey memory key, uint256[23] memory s) private {
        gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]);
    }

    function testValidProofBindsOneNullifierAndKey() public {
        IMaciSignup.PublicKey memory key = IMaciSignup.PublicKey(1, 2);
        uint256[23] memory s = _signals(key);
        _register(key, s);
        require(target.signups() == 1 && gate.usedNullifiers(42), "signup missing");
        bool blocked;
        try gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked && target.signups() == 1, "nullifier replay accepted");
    }

    function testWrongCitizenshipAndAgeBoundsFail() public {
        IMaciSignup.PublicKey memory key = IMaciSignup.PublicKey(1, 2);
        uint256[23] memory s = _signals(key);
        s[6] = uint256(uint24(bytes3("USA")));
        bool blocked;
        try gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked, "foreign citizenship accepted");
        s = _signals(key);
        s[19] = 0x303931303135;
        try gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked && target.signups() == 0, "weak age bound accepted");
    }

    function testInvalidProofOrRootFails() public {
        IMaciSignup.PublicKey memory key = IMaciSignup.PublicKey(1, 2);
        uint256[23] memory s = _signals(key);
        verifier.setValid(false);
        bool blocked;
        try gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked, "invalid proof accepted");
        verifier.setValid(true);
        registry.setValid(false);
        try gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked && target.signups() == 0, "invalid registry root accepted");
    }

    function testProofDateExpiresAtUtcMidnight() public {
        IMaciSignup.PublicKey memory key = IMaciSignup.PublicKey(1, 2);
        uint256[23] memory s = _signals(key);
        vm.warp((TODAY / 1 days + 1) * 1 days);
        bool blocked;
        try gate.register(key, ACCOUNT, s, [uint256(0), 0], [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked && target.signups() == 0, "stale proof date accepted");
    }

    function testProofCannotMoveToAnotherAccountCommitment() public {
        IMaciSignup.PublicKey memory key = IMaciSignup.PublicKey(1, 2);
        uint256[23] memory s = _signals(key);
        bool blocked;
        try gate.register(key, bytes32(uint256(456)), s, [uint256(0), 0],
            [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked && target.signups() == 0, "account binding bypassed");
    }

    function testProofCannotMoveToAnotherElectionOrKey() public {
        IMaciSignup.PublicKey memory key = IMaciSignup.PublicKey(1, 2);
        uint256[23] memory s = _signals(key);
        s[9] = 78;
        bool blocked;
        try gate.register(key, ACCOUNT, s, [uint256(0), 0],
            [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked, "election binding bypassed");
        s = _signals(key);
        try gate.register(IMaciSignup.PublicKey(3, 4), ACCOUNT, s, [uint256(0), 0],
            [[uint256(0), 0], [uint256(0), 0]], [uint256(0), 0]) {
            blocked = false;
        } catch { blocked = true; }
        require(blocked && target.signups() == 0, "MACI key binding bypassed");
    }
}
