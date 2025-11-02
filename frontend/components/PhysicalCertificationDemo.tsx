"use client";

import { useState } from "react";
import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { usePhysicalCertification } from "../hooks/usePhysicalCertification";

export const PhysicalCertificationDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const physicalCert = usePhysicalCertification({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [metrics, setMetrics] = useState({
    heartRate: 75,
    bmi: 22.5,
    bpSystolic: 120,
    bpDiastolic: 80,
    lungCapacity: 70,
    bloodOxygen: 98,
  });

  const formatFhevmStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'loading': 'Initializing secure encryption system...',
      'ready': 'Encryption system ready',
      'error': 'Encryption system error',
      'idle': 'Waiting for connection',
    };
    return statusMap[status] || status;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#dbeafe" }}>
            <svg className="w-10 h-10" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: "#1f2937" }}>Connect Your Wallet</h2>
          <p className="text-lg mb-8" style={{ color: "#6b7280" }}>
            Please connect your MetaMask wallet to access the health certification system
          </p>
        </div>
        <button
          className="btn-primary text-lg px-8 py-4 rounded-lg font-semibold"
          style={{ backgroundColor: "#2563eb" }}
          onClick={connect}
        >
          Connect MetaMask Wallet
        </button>
      </div>
    );
  }

  if (physicalCert.isDeployed === false) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="status-error flex items-start gap-4">
          <svg className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="font-bold text-lg mb-2">Contract Not Available</h3>
            <p>The health certification contract is not deployed on the current blockchain network (Chain ID: {chainId}). Please ensure you are connected to the correct network or contact the system administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  const formatStatusMessage = (message: string) => {
    if (!message) return "System ready to accept health metrics";
    
    // Remove any status= or status: patterns
    message = message.replace(/status\s*[:=]\s*\d+/gi, '');
    
    // Format common messages to be more user-friendly
    if (message.toLowerCase().includes('success')) {
      return message.replace(/success/gi, 'Successfully completed');
    }
    if (message.toLowerCase().includes('error')) {
      return message.replace(/error/gi, 'An error occurred');
    }
    
    return message;
  };

  return (
    <div className="space-y-6">
      {/* Connection Info Card */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-4" style={{ color: "#1f2937" }}>
              Connection Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#dbeafe" }}>
                  <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: "#6b7280" }}>Network Chain ID</p>
                  <p className="font-mono text-sm font-semibold truncate" style={{ color: "#1f2937" }}>{chainId}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#dbeafe" }}>
                  <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: "#6b7280" }}>Connected Wallet</p>
                  <p className="font-mono text-sm font-semibold truncate" style={{ color: "#1f2937" }}>
                    {accounts?.[0] ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : "Not available"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#dbeafe" }}>
                  <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: "#6b7280" }}>Smart Contract</p>
                  <p className="font-mono text-sm font-semibold truncate" style={{ color: "#1f2937" }}>
                    {physicalCert.contractAddress ? `${physicalCert.contractAddress.slice(0, 6)}...${physicalCert.contractAddress.slice(-4)}` : "Loading..."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: fhevmStatus === 'ready' ? "#dcfce7" : "#dbeafe" }}>
                  <svg className="w-5 h-5" style={{ color: fhevmStatus === 'ready' ? "#16a34a" : "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium" style={{ color: "#6b7280" }}>Encryption Status</p>
                  <p className="text-sm font-semibold truncate" style={{ color: "#1f2937" }}>{formatFhevmStatus(fhevmStatus)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Metrics Input Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#2563eb" }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#1f2937" }}>Health Metrics Submission</h2>
              <p className="text-sm" style={{ color: "#6b7280" }}>Enter your health data for encrypted evaluation</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-text">Heart Rate (beats per minute)</label>
            <div className="relative">
              <input
                type="number"
                className="input-field"
                value={metrics.heartRate}
                onChange={(e) => setMetrics({ ...metrics, heartRate: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 75"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b7280" }}>bpm</span>
            </div>
          </div>
          
          <div>
            <label className="label-text">Body Mass Index (BMI)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                className="input-field"
                value={metrics.bmi}
                onChange={(e) => setMetrics({ ...metrics, bmi: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 22.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b7280" }}>kg/m²</span>
            </div>
          </div>
          
          <div>
            <label className="label-text">Blood Pressure (Systolic)</label>
            <div className="relative">
              <input
                type="number"
                className="input-field"
                value={metrics.bpSystolic}
                onChange={(e) => setMetrics({ ...metrics, bpSystolic: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 120"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b7280" }}>mmHg</span>
            </div>
          </div>
          
          <div>
            <label className="label-text">Blood Pressure (Diastolic)</label>
            <div className="relative">
              <input
                type="number"
                className="input-field"
                value={metrics.bpDiastolic}
                onChange={(e) => setMetrics({ ...metrics, bpDiastolic: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 80"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b7280" }}>mmHg</span>
            </div>
          </div>
          
          <div>
            <label className="label-text">Lung Capacity Score</label>
            <div className="relative">
              <input
                type="number"
                className="input-field"
                value={metrics.lungCapacity}
                onChange={(e) => setMetrics({ ...metrics, lungCapacity: parseInt(e.target.value) || 0 })}
                placeholder="0-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b7280" }}>score</span>
            </div>
          </div>
          
          <div>
            <label className="label-text">Blood Oxygen Saturation</label>
            <div className="relative">
              <input
                type="number"
                className="input-field"
                value={metrics.bloodOxygen}
                onChange={(e) => setMetrics({ ...metrics, bloodOxygen: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 98"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b7280" }}>%</span>
            </div>
          </div>
        </div>
        
        <button
          className="btn-primary w-full mt-6 text-base py-4 flex items-center justify-center gap-2"
          style={{ backgroundColor: "#2563eb" }}
          disabled={!physicalCert.canSubmit}
          onClick={() => physicalCert.submitMetrics(metrics)}
        >
          {physicalCert.isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Encrypting and Submitting...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Submit Encrypted Health Metrics</span>
            </>
          )}
        </button>
      </div>

      {/* Eligibility Verification Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#dc2626" }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#1f2937" }}>Certification Verification</h2>
              <p className="text-sm" style={{ color: "#6b7280" }}>Retrieve and decrypt your eligibility status</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className="btn-primary py-4 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#2563eb" }}
            disabled={!physicalCert.canGetProof}
            onClick={physicalCert.refreshProofHandle}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Retrieve Verification Handle</span>
          </button>
          
          <button
            className="btn-secondary py-4 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#dc2626" }}
            disabled={!physicalCert.canDecrypt}
            onClick={physicalCert.decryptProof}
          >
            {physicalCert.isDecrypting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Decrypting Result...</span>
              </>
            ) : physicalCert.clearProof ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{physicalCert.clearProof.clear === BigInt(1) ? "CERTIFIED ELIGIBLE" : "NOT ELIGIBLE"}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <span>Decrypt Eligibility Status</span>
              </>
            )}
          </button>
        </div>
        
        {physicalCert.proofHandle && (
          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: "#f8f9fa", border: "2px solid #e5e7eb" }}>
            <p className="text-sm font-medium mb-2" style={{ color: "#6b7280" }}>Verification Handle ID</p>
            <p className="font-mono text-sm break-all" style={{ color: "#1f2937" }}>{physicalCert.proofHandle}</p>
          </div>
        )}
        
        {physicalCert.clearProof && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${physicalCert.clearProof.clear === BigInt(1) ? 'status-success' : 'status-error'}`}>
            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {physicalCert.clearProof.clear === BigInt(1) ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <div>
              <p className="font-bold text-lg mb-1">
                {physicalCert.clearProof.clear === BigInt(1) ? "Certification Approved" : "Certification Not Approved"}
              </p>
              <p className="text-sm">
                {physicalCert.clearProof.clear === BigInt(1) 
                  ? "Your health metrics meet all the required standards for certification. You are eligible." 
                  : "Your health metrics do not currently meet the required standards. Please consult with a healthcare professional."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Messages Card */}
      {physicalCert.message && (
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#dbeafe" }}>
              <svg className="w-5 h-5" style={{ color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1" style={{ color: "#1f2937" }}>System Status</p>
              <p style={{ color: "#6b7280" }}>{formatStatusMessage(physicalCert.message)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

