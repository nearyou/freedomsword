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
    error Unauthorized();

    address public immutable owner;
    IMaciSignup public maci;
    mapping(address => bool) public registered;

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

    function signUp(IMaciSignup.PublicKey calldata publicKey) external {
        if (address(maci) == address(0)) revert MaciNotConfigured();
        if (registered[msg.sender]) revert AlreadyRegistered();
        registered[msg.sender] = true;
        maci.signUp(publicKey, "");
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
