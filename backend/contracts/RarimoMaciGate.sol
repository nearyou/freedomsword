// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMaciSignup} from "./LocalMaciTestGate.sol";

interface IRarimoRegistry {
    function isRootValid(bytes32 root) external view returns (bool);
}

interface IRarimoTD3Verifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata publicSignals
    ) external view returns (bool);
}

/// @notice Rarimo TD3 proof gate for one MACI election. A proof binds one
/// election-scoped nullifier to one MACI key without revealing a passport.
contract RarimoMaciGate {
    error InvalidConfiguration();
    error InvalidProof();
    error InvalidSignals();
    error AlreadyRegistered();
    error RegistrationClosed();
    error Unauthorized();

    uint256 public constant SELECTOR = 38945; // nullifier, citizenship, counter < 1, expiry and age
    uint256 public constant UKR = uint256(uint24(bytes3("UKR")));
    uint256 private constant ZERO_DATE = 0x303030303030;
    uint256 private constant FIELD =
        21888242871839275222246405745257275088696311157297823662689037894645226208583;

    address public immutable owner;
    IRarimoRegistry public immutable registry;
    IRarimoTD3Verifier public immutable verifier;
    uint256 public immutable electionId;
    uint256 public immutable closesAt;
    IMaciSignup public maci;
    mapping(uint256 => bool) public usedNullifiers;
    mapping(bytes32 => bool) public usedPublicKeys;

    event RarimoSignup(uint256 indexed nullifier, uint256 publicKeyX, uint256 publicKeyY);

    constructor(address registry_, address verifier_, uint256 electionId_, uint256 closesAt_) {
        if (registry_.code.length == 0 || verifier_.code.length == 0 ||
            electionId_ == 0 || closesAt_ <= block.timestamp) revert InvalidConfiguration();
        owner = msg.sender;
        registry = IRarimoRegistry(registry_);
        verifier = IRarimoTD3Verifier(verifier_);
        electionId = electionId_;
        closesAt = closesAt_;
    }

    function setMaci(address maci_) external {
        if (msg.sender != owner || address(maci) != address(0) || maci_.code.length == 0)
            revert Unauthorized();
        maci = IMaciSignup(maci_);
    }

    function eventData(IMaciSignup.PublicKey memory key, bytes32 accountCommitment)
        public view returns (uint256) {
        return uint256(keccak256(abi.encode(address(this), key.x, key.y, accountCommitment))) % FIELD;
    }

    function register(
        IMaciSignup.PublicKey calldata key,
        bytes32 accountCommitment,
        uint256[23] calldata signals,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external {
        if (block.timestamp >= closesAt) revert RegistrationClosed();
        if (address(maci) == address(0)) revert InvalidConfiguration();
        uint256 nullifier = signals[0];
        bytes32 keyHash = keccak256(abi.encode(key.x, key.y));
        if (nullifier == 0 || key.x == 0 || key.y == 0 || accountCommitment == bytes32(0))
            revert InvalidSignals();
        if (usedNullifiers[nullifier] || usedPublicKeys[keyHash]) revert AlreadyRegistered();
        if (signals[6] != UKR || signals[9] != electionId ||
            signals[10] != eventData(key, accountCommitment) || signals[12] != SELECTOR ||
            signals[17] != 1 || signals[16] != 0 ||
            signals[20] != signals[13] || signals[21] != ZERO_DATE ||
            signals[18] != ZERO_DATE || signals[19] != ageUpperBound(signals[13]) ||
            signals[14] != 0 || signals[15] != 0 || signals[22] != 0 ||
            !registry.isRootValid(bytes32(signals[11]))) revert InvalidSignals();
        uint256 proofDay = _timestampFromDate(signals[13]);
        if (proofDay != (block.timestamp / 1 days) * 1 days)
            revert InvalidSignals();
        uint256[] memory publicSignals = new uint256[](23);
        for (uint256 i; i < 23; ++i) publicSignals[i] = signals[i];
        if (!verifier.verifyProof(a, b, c, publicSignals)) revert InvalidProof();
        usedNullifiers[nullifier] = true;
        usedPublicKeys[keyHash] = true;
        maci.signUp(key, "");
        emit RarimoSignup(nullifier, key.x, key.y);
    }

    /// @dev The Rarimo circuit normalizes two-digit birth years against the
    /// current date. A strict upper bound one day after the 18th birthday
    /// includes people who turn 18 today without revealing their birth date.
    function ageUpperBound(uint256 currentDate) public pure returns (uint256) {
        (uint256 yy, uint256 mm, uint256 dd) = _components(currentDate);
        if (yy < 18) revert InvalidSignals();
        uint256 birthYear = 2000 + yy - 18;
        uint256 lastDay = _daysInMonth(birthYear, mm);
        uint256 cutoffDay = dd > lastDay ? lastDay : dd;
        if (cutoffDay < lastDay) return _encodeDate(yy - 18, mm, cutoffDay + 1);
        if (mm < 12) return _encodeDate(yy - 18, mm + 1, 1);
        return _encodeDate(yy - 17, 1, 1);
    }

    function _components(uint256 date) private pure returns (uint256 yy, uint256 mm, uint256 dd) {
        uint256[6] memory d;
        for (uint256 i; i < 6; ++i) {
            uint256 digit = (date >> (8 * (5 - i))) & 0xff;
            if (digit < 48 || digit > 57) revert InvalidSignals();
            d[i] = digit - 48;
        }
        yy = d[0] * 10 + d[1];
        mm = d[2] * 10 + d[3];
        dd = d[4] * 10 + d[5];
        if (mm == 0 || mm > 12 || dd == 0 || dd > _daysInMonth(2000 + yy, mm))
            revert InvalidSignals();
    }

    function _daysInMonth(uint256 year, uint256 month) private pure returns (uint256) {
        if (month == 2) return (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)) ? 29 : 28;
        if (month == 4 || month == 6 || month == 9 || month == 11) return 30;
        return 31;
    }

    function _encodeDate(uint256 yy, uint256 mm, uint256 dd) private pure returns (uint256 date) {
        if (yy > 99 || mm > 99 || dd > 99) revert InvalidSignals();
        uint256 packed = yy * 10000 + mm * 100 + dd;
        for (uint256 i; i < 6; ++i) {
            date |= (48 + packed % 10) << (8 * i);
            packed /= 10;
        }
    }

    function _timestampFromDate(uint256 date) private pure returns (uint256) {
        (uint256 yy, uint256 mm, uint256 dd) = _components(date);
        int256 year = int256(2000 + yy);
        int256 month = int256(mm);
        int256 day = int256(dd);
        int256 daysSinceEpoch = day - 32075 +
            1461 * (year + 4800 + (month - 14) / 12) / 4 +
            367 * (month - 2 - ((month - 14) / 12) * 12) / 12 -
            3 * ((year + 4900 + (month - 14) / 12) / 100) / 4 - 2440588;
        return uint256(daysSinceEpoch) * 1 days;
    }
}
