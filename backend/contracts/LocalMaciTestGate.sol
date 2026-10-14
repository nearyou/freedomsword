// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMaciSignup {
    struct PublicKey {
        uint256 x;
        uint256 y;
    }

    function signUp(PublicKey memory publicKey, bytes memory policyData) external;
}

/// @notice Allows local MACI integration tests without a passport proof.
/// This contract cannot be deployed on a public chain.
contract LocalMaciTestGate {
    error LocalChainOnly();
    error AlreadyRegistered();
    error MaciNotConfigured();
    error InvalidTarget();
    error InvalidNullifier();
    error Unauthorized();

    address public immutable owner;
    IMaciSignup public maci;
    mapping(bytes32 => bool) public usedTestNullifiers;
    mapping(bytes32 => bool) public usedPublicKeys;

    event LocalTestSignup(bytes32 indexed testNullifier, uint256 publicKeyX, uint256 publicKeyY);

    constructor() {
        if (block.chainid != 31337) revert LocalChainOnly();
        owner = msg.sender;
    }

    function setMaci(address maci_) external {
        if (msg.sender != owner || address(maci) != address(0) || maci_ == address(0))
            revert Unauthorized();
        if (maci_.code.length == 0) revert InvalidTarget();
        maci = IMaciSignup(maci_);
    }

    /// @notice Local-only relayed signup for a distinct test citizen.
    /// The owner is trusted to issue opaque one-use nullifiers; this does not prove personhood.
    function signUpFor(bytes32 testNullifier, IMaciSignup.PublicKey calldata publicKey) external {
        if (msg.sender != owner) revert Unauthorized();
        if (address(maci) == address(0)) revert MaciNotConfigured();
        if (testNullifier == bytes32(0)) revert InvalidNullifier();
        if (usedTestNullifiers[testNullifier]) revert AlreadyRegistered();
        bytes32 publicKeyHash = keccak256(abi.encode(publicKey.x, publicKey.y));
        if (usedPublicKeys[publicKeyHash]) revert AlreadyRegistered();
        usedTestNullifiers[testNullifier] = true;
        usedPublicKeys[publicKeyHash] = true;
        maci.signUp(publicKey, "");
        emit LocalTestSignup(testNullifier, publicKey.x, publicKey.y);
    }
}

/// @notice Restricts MACI signups to a gate contract. Set the MACI target once.
contract MaciGateOnlyPolicy {
    error Unauthorized();

    address public immutable owner;
    address public immutable gate;
    address public guarded;

    constructor(address gate_) {
        if (gate_ == address(0)) revert Unauthorized();
        owner = msg.sender;
        gate = gate_;
    }

    function setTarget(address maci_) external {
        if (msg.sender != owner || guarded != address(0) || maci_ == address(0))
            revert Unauthorized();
        if (maci_.code.length == 0) revert Unauthorized();
        guarded = maci_;
    }

    function enforce(address subject, bytes calldata) external view {
        if (msg.sender != guarded || subject != gate) revert Unauthorized();
    }
}
