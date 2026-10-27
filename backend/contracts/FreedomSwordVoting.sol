// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Operator-relayed ledger for fictional FreedomSword elections.
/// @dev Voter eligibility and candidate membership are checked by the application.
///      A public chain cannot hide the timing or repeated use of a ballot nullifier.
contract FreedomSwordVoting {
    uint8 public constant BALLOT_UNITS = 100;

    struct Policy {
        bool recallEnabled;
        bool fullEnabled;
        bool partialEnabled;
        uint8 partialAmount;
        uint32 firstDelay;
        uint32 cooldown;
        uint8 maxOperations; // zero means unlimited
    }

    struct Election {
        uint64 opensAt;
        uint64 closesAt;
        bool exists;
        bool closed;
        Policy policy;
    }

    struct Ballot {
        uint64 castAt;
        uint64 lastRecallAt;
        uint8 balance;
        uint8 recalls;
        bytes32 candidateCommitment;
    }

    address public owner;
    address public relayer;
    mapping(bytes32 => Election) public elections;
    mapping(bytes32 => bytes32) public configurationHash;
    mapping(bytes32 => mapping(bytes32 => Ballot)) public ballots;
    mapping(bytes32 => bool) public appliedActions;

    event RelayerChanged(address indexed relayer);
    event ElectionRegistered(bytes32 indexed electionId, uint64 opensAt, uint64 closesAt);
    event ElectionClosed(bytes32 indexed electionId, bytes32 indexed auditCommitment);
    event VoteCast(bytes32 indexed electionId, bytes32 indexed nullifier, bytes32 indexed auditCommitment);
    event VoteRecalled(bytes32 indexed electionId, bytes32 indexed nullifier, bytes32 indexed auditCommitment, uint8 units, uint8 balance);
    event AuditAnchored(bytes32 indexed auditCommitment);

    error Unauthorized();
    error InvalidInput();
    error ElectionUnavailable();
    error ElectionAlreadyRegistered();
    error BallotAlreadyExists();
    error BallotMissing();
    error RecallUnavailable();
    error ActionAlreadyApplied();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert Unauthorized();
        _;
    }

    constructor(address initialRelayer) {
        if (initialRelayer == address(0)) revert InvalidInput();
        owner = msg.sender;
        relayer = initialRelayer;
    }

    function setRelayer(address nextRelayer) external onlyOwner {
        if (nextRelayer == address(0)) revert InvalidInput();
        relayer = nextRelayer;
        emit RelayerChanged(nextRelayer);
    }

    function registerElection(bytes32 electionId, uint64 opensAt, uint64 closesAt, Policy calldata policy)
        external onlyRelayer
    {
        _registerElection(electionId, opensAt, closesAt, policy);
    }

    function _registerElection(bytes32 electionId, uint64 opensAt, uint64 closesAt, Policy calldata policy)
        private
    {
        if (electionId == bytes32(0) || opensAt >= closesAt || closesAt <= block.timestamp ||
            policy.partialAmount == 0 || policy.partialAmount > BALLOT_UNITS) revert InvalidInput();
        if (elections[electionId].exists || elections[electionId].closed) revert ElectionAlreadyRegistered();
        elections[electionId] = Election(opensAt, closesAt, true, false, policy);
        configurationHash[electionId] = keccak256(abi.encode(
            opensAt, closesAt, policy.recallEnabled, policy.fullEnabled,
            policy.partialEnabled, policy.partialAmount, policy.firstDelay,
            policy.cooldown, policy.maxOperations
        ));
        emit ElectionRegistered(electionId, opensAt, closesAt);
    }

    function closeElection(bytes32 electionId, bytes32 auditCommitment) external onlyRelayer {
        Election storage election = elections[electionId];
        if (electionId == bytes32(0) || election.closed) revert ElectionUnavailable();
        _useAction(auditCommitment);
        election.closed = true;
        emit ElectionClosed(electionId, auditCommitment);
    }

    function castVote(bytes32 electionId, bytes32 nullifier, bytes32 candidateCommitment, bytes32 auditCommitment,
        uint64 opensAt, uint64 closesAt, Policy calldata policy)
        external onlyRelayer
    {
        if (!elections[electionId].exists) _registerElection(electionId, opensAt, closesAt, policy);
        if (configurationHash[electionId] != keccak256(abi.encode(
            opensAt, closesAt, policy.recallEnabled, policy.fullEnabled,
            policy.partialEnabled, policy.partialAmount, policy.firstDelay,
            policy.cooldown, policy.maxOperations
        ))) revert InvalidInput();
        _requireOpen(electionId);
        if (nullifier == bytes32(0) || candidateCommitment == bytes32(0)) revert InvalidInput();
        if (ballots[electionId][nullifier].castAt != 0) revert BallotAlreadyExists();
        _useAction(auditCommitment);
        ballots[electionId][nullifier] = Ballot(uint64(block.timestamp), 0, BALLOT_UNITS, 0, candidateCommitment);
        emit VoteCast(electionId, nullifier, auditCommitment);
    }

    function recallVote(bytes32 electionId, bytes32 nullifier, bool full, bytes32 auditCommitment)
        external onlyRelayer
    {
        uint8 amount = full ? ballots[electionId][nullifier].balance : elections[electionId].policy.partialAmount;
        _recall(electionId, nullifier, amount, full, auditCommitment);
    }

    function selectableRecallSupported() external pure returns (bool) { return true; }

    function recallVoteAmount(bytes32 electionId, bytes32 nullifier, uint8 amount, bytes32 auditCommitment)
        external onlyRelayer
    {
        if (amount == 0) revert InvalidInput();
        Policy storage policy = elections[electionId].policy;
        if (policy.partialAmount == 0 || amount % policy.partialAmount != 0) revert RecallUnavailable();
        _recall(electionId, nullifier, amount, false, auditCommitment);
    }

    function _recall(bytes32 electionId, bytes32 nullifier, uint8 amount, bool full, bytes32 auditCommitment)
        private
    {
        Election storage election = _requireOpen(electionId);
        Ballot storage ballot = ballots[electionId][nullifier];
        if (ballot.castAt == 0) revert BallotMissing();
        Policy storage policy = election.policy;
        if (ballot.balance == 0 || !policy.recallEnabled ||
            (full && !policy.fullEnabled) || (!full && !policy.partialEnabled) ||
            (policy.maxOperations != 0 && ballot.recalls >= policy.maxOperations) ||
            block.timestamp < uint256(ballot.castAt) + policy.firstDelay ||
            (ballot.lastRecallAt != 0 && block.timestamp < uint256(ballot.lastRecallAt) + policy.cooldown))
            revert RecallUnavailable();
        if (amount > ballot.balance) revert RecallUnavailable();
        _useAction(auditCommitment);
        ballot.balance -= amount;
        ballot.recalls += 1;
        ballot.lastRecallAt = uint64(block.timestamp);
        emit VoteRecalled(electionId, nullifier, auditCommitment, amount, ballot.balance);
    }

    function anchorAudit(bytes32 auditCommitment) external onlyRelayer {
        _useAction(auditCommitment);
        emit AuditAnchored(auditCommitment);
    }

    function _requireOpen(bytes32 electionId) private view returns (Election storage election) {
        election = elections[electionId];
        if (!election.exists || election.closed ||
            block.timestamp < election.opensAt || block.timestamp >= election.closesAt)
            revert ElectionUnavailable();
    }

    function _useAction(bytes32 auditCommitment) private {
        if (auditCommitment == bytes32(0)) revert InvalidInput();
        if (appliedActions[auditCommitment]) revert ActionAlreadyApplied();
        appliedActions[auditCommitment] = true;
    }
}
