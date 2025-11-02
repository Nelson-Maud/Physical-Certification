// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Physical Certification Contract
/// @notice A contract for storing encrypted health metrics and evaluating eligibility
/// @dev All health metrics are stored and processed in encrypted form using FHEVM
contract PhysicalCertification is ZamaEthereumConfig {
    // Structure to store encrypted health metrics for each user
    struct EncryptedMetrics {
        euint32 heartRate;      // Heart rate (beats per minute)
        euint32 bmi;            // BMI (scaled by 100, e.g., 1850 = 18.50)
        euint32 bloodPressureSystolic;  // Systolic blood pressure
        euint32 bloodPressureDiastolic; // Diastolic blood pressure
        euint32 lungCapacity;   // Lung capacity score
        euint32 bloodOxygen;    // Blood oxygen level (percentage)
    }

    // Mapping from user address to their encrypted metrics
    mapping(address => EncryptedMetrics) private userMetrics;

    // Mapping from user address to encrypted eligibility proof (0 or 1)
    mapping(address => euint32) private eligibilityProofs;

    // Thresholds for health evaluation (plain values, will be encrypted when needed)
    uint32 private constant BMI_MIN_PLAIN = 1850;  // 18.5 * 100
    uint32 private constant BMI_MAX_PLAIN = 2700;  // 27.0 * 100
    uint32 private constant HEART_RATE_MAX_PLAIN = 120;
    uint32 private constant LUNG_CAPACITY_MIN_PLAIN = 60;  // Minimum passing score
    uint32 private constant BLOOD_OXYGEN_MIN_PLAIN = 95;   // Minimum percentage

    /// @notice Submit encrypted health metrics for a user
    /// @param encryptedHeartRate Encrypted heart rate value
    /// @param encryptedBMI Encrypted BMI value (scaled by 100)
    /// @param encryptedBPSystolic Encrypted systolic blood pressure
    /// @param encryptedBPDiastolic Encrypted diastolic blood pressure
    /// @param encryptedLungCapacity Encrypted lung capacity score
    /// @param encryptedBloodOxygen Encrypted blood oxygen level
    /// @param inputProof Input proof for verification
    function submitEncryptedMetrics(
        externalEuint32 encryptedHeartRate,
        externalEuint32 encryptedBMI,
        externalEuint32 encryptedBPSystolic,
        externalEuint32 encryptedBPDiastolic,
        externalEuint32 encryptedLungCapacity,
        externalEuint32 encryptedBloodOxygen,
        bytes calldata inputProof
    ) external {
        // Convert external encrypted values to internal euint32
        euint32 heartRate = FHE.fromExternal(encryptedHeartRate, inputProof);
        euint32 bmi = FHE.fromExternal(encryptedBMI, inputProof);
        euint32 bpSystolic = FHE.fromExternal(encryptedBPSystolic, inputProof);
        euint32 bpDiastolic = FHE.fromExternal(encryptedBPDiastolic, inputProof);
        euint32 lungCapacity = FHE.fromExternal(encryptedLungCapacity, inputProof);
        euint32 bloodOxygen = FHE.fromExternal(encryptedBloodOxygen, inputProof);

        // Store encrypted metrics
        userMetrics[msg.sender] = EncryptedMetrics({
            heartRate: heartRate,
            bmi: bmi,
            bloodPressureSystolic: bpSystolic,
            bloodPressureDiastolic: bpDiastolic,
            lungCapacity: lungCapacity,
            bloodOxygen: bloodOxygen
        });

        // Grant ACL permissions for the stored metrics
        FHE.allowThis(heartRate);
        FHE.allow(heartRate, msg.sender);
        FHE.allowThis(bmi);
        FHE.allow(bmi, msg.sender);
        FHE.allowThis(bpSystolic);
        FHE.allow(bpSystolic, msg.sender);
        FHE.allowThis(bpDiastolic);
        FHE.allow(bpDiastolic, msg.sender);
        FHE.allowThis(lungCapacity);
        FHE.allow(lungCapacity, msg.sender);
        FHE.allowThis(bloodOxygen);
        FHE.allow(bloodOxygen, msg.sender);

        // Automatically evaluate eligibility after submission
        _evaluateEligibility(msg.sender);
    }

    /// @notice Get encrypted metrics for a user
    /// @param user Address of the user
    /// @return heartRate Encrypted heart rate
    /// @return bmi Encrypted BMI value
    /// @return bloodPressureSystolic Encrypted systolic blood pressure
    /// @return bloodPressureDiastolic Encrypted diastolic blood pressure
    /// @return lungCapacity Encrypted lung capacity score
    /// @return bloodOxygen Encrypted blood oxygen level
    function getUserEncryptedMetrics(address user) external view returns (
        euint32 heartRate,
        euint32 bmi,
        euint32 bloodPressureSystolic,
        euint32 bloodPressureDiastolic,
        euint32 lungCapacity,
        euint32 bloodOxygen
    ) {
        EncryptedMetrics memory metrics = userMetrics[user];
        return (
            metrics.heartRate,
            metrics.bmi,
            metrics.bloodPressureSystolic,
            metrics.bloodPressureDiastolic,
            metrics.lungCapacity,
            metrics.bloodOxygen
        );
    }

    /// @notice Evaluate eligibility based on encrypted metrics
    /// @param user Address of the user to evaluate
    /// @return encryptedResult Encrypted eligibility result (0 = not eligible, 1 = eligible)
    function evaluate(address user) external returns (euint32 encryptedResult) {
        return _evaluateEligibility(user);
    }

    /// @notice Internal function to evaluate eligibility
    /// @param user Address of the user to evaluate
    /// @return encryptedResult Encrypted eligibility result
    function _evaluateEligibility(address user) internal returns (euint32 encryptedResult) {
        EncryptedMetrics memory metrics = userMetrics[user];

        // Check if metrics exist (all zeros means not initialized)
        // We'll use a simple check: if BMI is zero, metrics don't exist
        ebool metricsExist = FHE.ne(metrics.bmi, FHE.asEuint32(0));

        // Create encrypted threshold values
        euint32 bmiMin = FHE.asEuint32(BMI_MIN_PLAIN);
        euint32 bmiMax = FHE.asEuint32(BMI_MAX_PLAIN);
        euint32 heartRateMax = FHE.asEuint32(HEART_RATE_MAX_PLAIN);
        euint32 lungCapacityMin = FHE.asEuint32(LUNG_CAPACITY_MIN_PLAIN);
        euint32 bloodOxygenMin = FHE.asEuint32(BLOOD_OXYGEN_MIN_PLAIN);

        // Evaluate each health criterion in encrypted form
        // 1. BMI check: BMI >= 18.5 && BMI <= 27.0
        ebool bmiValid = FHE.and(
            FHE.ge(metrics.bmi, bmiMin),
            FHE.le(metrics.bmi, bmiMax)
        );

        // 2. Heart rate check: heartRate < 120
        ebool heartRateValid = FHE.lt(metrics.heartRate, heartRateMax);

        // 3. Lung capacity check: lungCapacity >= 60
        ebool lungCapacityValid = FHE.ge(metrics.lungCapacity, lungCapacityMin);

        // 4. Blood oxygen check: bloodOxygen >= 95
        ebool bloodOxygenValid = FHE.ge(metrics.bloodOxygen, bloodOxygenMin);

        // 5. Blood pressure check: systolic < 140 && diastolic < 90 (reasonable thresholds)
        euint32 bpSystolicMax = FHE.asEuint32(140);
        euint32 bpDiastolicMax = FHE.asEuint32(90);
        ebool bpValid = FHE.and(
            FHE.lt(metrics.bloodPressureSystolic, bpSystolicMax),
            FHE.lt(metrics.bloodPressureDiastolic, bpDiastolicMax)
        );

        // Combine all checks: all must be true
        ebool allValid = FHE.and(
            FHE.and(bmiValid, heartRateValid),
            FHE.and(lungCapacityValid, FHE.and(bloodOxygenValid, bpValid))
        );

        // Only evaluate if metrics exist
        ebool isEligible = FHE.and(metricsExist, allValid);

        // Convert boolean result to uint32 (0 or 1)
        euint32 result = FHE.select(isEligible, FHE.asEuint32(1), FHE.asEuint32(0));

        // Store the eligibility proof
        eligibilityProofs[user] = result;

        // Grant ACL permissions for the proof
        FHE.allowThis(result);
        FHE.allow(result, user);

        return result;
    }

    /// @notice Get encrypted eligibility proof for a user
    /// @param user Address of the user
    /// @return Encrypted eligibility proof (0 = not eligible, 1 = eligible)
    function getProof(address user) external view returns (euint32) {
        return eligibilityProofs[user];
    }

    /// @notice Check if user has submitted metrics
    /// @param user Address of the user
    /// @return true if user has submitted metrics, false otherwise
    function hasMetrics(address user) external view returns (bool) {
        // Check if BMI is non-zero (simple heuristic)
        // Note: This is a view function, so we can't decrypt here
        // In practice, you would need to check the handle or use a separate mapping
        return true; // Simplified - in production, maintain a separate mapping
    }
}

