// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FreedomSwordVoting} from "./FreedomSwordVoting.sol";

interface Vm {
    function warp(uint256) external;
    function prank(address) external;
}

contract FreedomSwordVotingTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    FreedomSwordVoting private voting;
    bytes32 private constant ELECTION = keccak256("fictional-election");
    bytes32 private constant VOTER = keccak256("opaque-voter");
    bytes32 private constant CANDIDATE = keccak256("opaque-choice");
    bytes32 private constant CAST = keccak256("cast-audit");

    function setUp() public {
        voting = new FreedomSwordVoting(address(this));
        voting.registerElection(ELECTION, uint64(block.timestamp), uint64(block.timestamp + 1000),
            FreedomSwordVoting.Policy(true, true, true, 25, 0, 0, 4));
    }

    function _cast(bytes32 electionId, bytes32 nullifier, bytes32 action) private {
        voting.castVote(electionId, nullifier, CANDIDATE, action,
            uint64(block.timestamp), uint64(block.timestamp + 1000),
            FreedomSwordVoting.Policy(true, true, true, 25, 0, 0, 4));
    }

    function testOneBallotAndFullRecallCannotRecast() public {
        _cast(ELECTION, VOTER, CAST);
        (,,uint8 balance,,) = voting.ballots(ELECTION, VOTER);
        require(balance == 100, "initial units");
        voting.recallVote(ELECTION, VOTER, true, keccak256("full"));
        (,,balance,,) = voting.ballots(ELECTION, VOTER);
        require(balance == 0, "full recall");
        try voting.castVote(ELECTION, VOTER, CANDIDATE, keccak256("again"),
            uint64(block.timestamp), uint64(block.timestamp + 1000),
            FreedomSwordVoting.Policy(true, true, true, 25, 0, 0, 4)) {
            revert("second ballot accepted");
        } catch {}
        try voting.recallVote(ELECTION, VOTER, false, keccak256("empty")) {
            revert("empty recall accepted");
        } catch {}
    }

    function testPartialAmountAndOperationLimit() public {
        _cast(ELECTION, VOTER, CAST);
        for (uint256 i = 0; i < 4; i++) {
            voting.recallVote(ELECTION, VOTER, false, keccak256(abi.encode(i)));
        }
        (,,uint8 balance,uint8 recalls,) = voting.ballots(ELECTION, VOTER);
        require(balance == 0 && recalls == 4, "partial recall state");
    }

    function testCooldownAndWindow() public {
        bytes32 timed = keccak256("timed");
        voting.registerElection(timed, uint64(block.timestamp), uint64(block.timestamp + 200),
            FreedomSwordVoting.Policy(true, true, true, 30, 20, 30, 2));
        voting.castVote(timed, VOTER, CANDIDATE, CAST,
            uint64(block.timestamp), uint64(block.timestamp + 200),
            FreedomSwordVoting.Policy(true, true, true, 30, 20, 30, 2));
        try voting.recallVote(timed, VOTER, false, keccak256("early")) {
            revert("early recall accepted");
        } catch {}
        vm.warp(block.timestamp + 20);
        voting.recallVote(timed, VOTER, false, keccak256("first"));
        try voting.recallVote(timed, VOTER, false, keccak256("cooldown")) {
            revert("cooldown ignored");
        } catch {}
        vm.warp(block.timestamp + 30);
        voting.recallVote(timed, VOTER, false, keccak256("second"));
        try voting.recallVote(timed, VOTER, true, keccak256("limit")) {
            revert("operation limit ignored");
        } catch {}
        vm.warp(block.timestamp + 200);
        try voting.castVote(timed, keccak256("late"), CANDIDATE, keccak256("late-action"),
            uint64(block.timestamp - 250), uint64(block.timestamp - 50),
            FreedomSwordVoting.Policy(true, true, true, 30, 20, 30, 2)) {
            revert("closed window accepted");
        } catch {}
    }

    function testOnlyRelayerAndUniqueAuditAction() public {
        vm.prank(address(0xBEEF));
        try voting.castVote(ELECTION, VOTER, CANDIDATE, CAST,
            uint64(block.timestamp), uint64(block.timestamp + 1000),
            FreedomSwordVoting.Policy(true, true, true, 25, 0, 0, 4)) {
            revert("unauthorized cast accepted");
        } catch {}
        _cast(ELECTION, VOTER, CAST);
        try voting.anchorAudit(CAST) {
            revert("duplicate action accepted");
        } catch {}
        voting.closeElection(ELECTION, keccak256("close"));
        try voting.castVote(ELECTION, keccak256("other"), CANDIDATE, keccak256("other-audit"),
            uint64(block.timestamp), uint64(block.timestamp + 1000),
            FreedomSwordVoting.Policy(true, true, true, 25, 0, 0, 4)) {
            revert("closed election accepted");
        } catch {}
    }

    function testFirstCastRegistersImmutablePolicy() public {
        bytes32 fresh = keccak256("fresh-election");
        FreedomSwordVoting.Policy memory settings = FreedomSwordVoting.Policy(true, true, true, 30, 0, 0, 3);
        voting.castVote(fresh, VOTER, CANDIDATE, CAST,
            uint64(block.timestamp), uint64(block.timestamp + 1000), settings);
        require(voting.configurationHash(fresh) != bytes32(0), "configuration missing");
        settings.partialAmount = 25;
        try voting.castVote(fresh, keccak256("second-voter"), CANDIDATE, keccak256("second-cast"),
            uint64(block.timestamp), uint64(block.timestamp + 1000), settings) {
            revert("policy changed after registration");
        } catch {}
    }

    function testCloseBeforeFirstCastBlocksRegistration() public {
        bytes32 fresh = keccak256("never-opened");
        voting.closeElection(fresh, keccak256("close-before-ballot"));
        try voting.castVote(fresh, VOTER, CANDIDATE, CAST,
            uint64(block.timestamp), uint64(block.timestamp + 1000),
            FreedomSwordVoting.Policy(true, true, true, 25, 0, 0, 4)) {
            revert("closed election registered");
        } catch {}
    }

    function testOwnerCanRotateRelayer() public {
        bytes32 action = keccak256("new-relayer-action");
        voting.setRelayer(address(0xBEEF));
        try voting.anchorAudit(action) {
            revert("old relayer still authorized");
        } catch {}
        vm.prank(address(0xBEEF));
        voting.anchorAudit(action);
        require(voting.appliedActions(action), "new relayer did not anchor");
    }
}
