"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { PhysicalCertificationAddresses } from "@/abi/PhysicalCertificationAddresses";
import { PhysicalCertificationABI } from "@/abi/PhysicalCertificationABI";

type ContractInfo = {
  abi: typeof PhysicalCertificationABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getContractByChainId(chainId: number | undefined): ContractInfo {
  if (!chainId) {
    return { abi: PhysicalCertificationABI.abi };
  }

  const chainIdStr = chainId.toString();
  const entry = (PhysicalCertificationAddresses as Record<string, { address: string; chainId: number; chainName: string } | undefined>)[chainIdStr];

  if (!entry || !entry.address || entry.address === ethers.ZeroAddress) {
    return { abi: PhysicalCertificationABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}`,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: PhysicalCertificationABI.abi,
  };
}

export const usePhysicalCertification = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [proofHandle, setProofHandle] = useState<string | undefined>(undefined);
  const [clearProof, setClearProof] = useState<{ handle: string; clear: bigint | boolean | `0x${string}` | undefined } | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const contractRef = useRef<ContractInfo | undefined>(undefined);
  const isSubmittingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);
  const isEvaluatingRef = useRef<boolean>(false);

  const contract = useMemo(() => {
    const c = getContractByChainId(chainId);
    contractRef.current = c;
    if (!c.address) {
      setMessage(`Smart contract not available on this network. Please switch to a supported network.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    return Boolean(contract.address && contract.address !== ethers.ZeroAddress);
  }, [contract]);

  const canSubmit = useMemo(() => {
    return contract.address && instance && ethersSigner && !isSubmitting;
  }, [contract.address, instance, ethersSigner, isSubmitting]);

  const canGetProof = useMemo(() => {
    return contract.address && ethersReadonlyProvider && !isDecrypting && !isEvaluating;
  }, [contract.address, ethersReadonlyProvider, isDecrypting, isEvaluating]);

  const canDecrypt = useMemo(() => {
    return (
      contract.address &&
      instance &&
      ethersSigner &&
      !isDecrypting &&
      proofHandle &&
      proofHandle !== ethers.ZeroHash &&
      proofHandle !== clearProof?.handle
    );
  }, [contract.address, instance, ethersSigner, isDecrypting, proofHandle, clearProof]);

  const submitMetrics = useCallback(
    async (metrics: {
      heartRate: number;
      bmi: number;
      bpSystolic: number;
      bpDiastolic: number;
      lungCapacity: number;
      bloodOxygen: number;
    }) => {
      if (isSubmittingRef.current || !contract.address || !instance || !ethersSigner) {
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = contract.address;
      const thisEthersSigner = ethersSigner;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting metrics...");

      const run = async () => {
        const isStale = () =>
          thisContractAddress !== contractRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const input = instance.createEncryptedInput(
            thisContractAddress,
            thisEthersSigner.address
          );

          // BMI is scaled by 100 (e.g., 22.5 -> 2250)
          const bmiScaled = Math.round(metrics.bmi * 100);

          input.add32(metrics.heartRate);
          input.add32(bmiScaled);
          input.add32(metrics.bpSystolic);
          input.add32(metrics.bpDiastolic);
          input.add32(metrics.lungCapacity);
          input.add32(metrics.bloodOxygen);

          setMessage("Encrypting... (this may take a moment)");
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Operation cancelled");
            return;
          }

          setMessage("Submitting transaction...");

          const contractInstance = new ethers.Contract(
            thisContractAddress,
            contract.abi,
            thisEthersSigner
          );

          const tx = await contractInstance.submitEncryptedMetrics(
            enc.handles[0],
            enc.handles[1],
            enc.handles[2],
            enc.handles[3],
            enc.handles[4],
            enc.handles[5],
            enc.inputProof
          );

          setMessage(`Transaction submitted successfully`);

          const receipt = await tx.wait();
          setMessage(`Health metrics submitted and encrypted successfully!`);

          if (isStale()) {
            return;
          }

          // Automatically evaluate after submission
          evaluateEligibility();
        } catch (error: any) {
          setMessage(`Error: ${error.message || "Submission failed"}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [contract, instance, ethersSigner, chainId, sameChain, sameSigner]
  );

  const evaluateEligibility = useCallback(() => {
    if (isEvaluatingRef.current || !contract.address || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = contract.address;
    const thisEthersSigner = ethersSigner;

    isEvaluatingRef.current = true;
    setIsEvaluating(true);
    setMessage("Evaluating eligibility...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== contractRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const contractInstance = new ethers.Contract(
          thisContractAddress,
          contract.abi,
          thisEthersSigner
        );

        const tx = await contractInstance.evaluate(thisEthersSigner.address);
        setMessage(`Processing eligibility evaluation...`);

        const receipt = await tx.wait();
        setMessage(`Eligibility evaluation completed successfully!`);

        if (isStale()) {
          return;
        }

        // Refresh proof handle
        refreshProofHandle();
      } catch (error: any) {
        setMessage(`Evaluation error: ${error.message || "Failed"}`);
      } finally {
        isEvaluatingRef.current = false;
        setIsEvaluating(false);
      }
    };

    run();
  }, [contract, ethersSigner, chainId, sameChain, sameSigner]);

  const refreshProofHandle = useCallback(() => {
    if (!contract.address || !ethersReadonlyProvider || !ethersSigner) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = contract.address;

    const contractInstance = new ethers.Contract(
      thisContractAddress,
      contract.abi,
      ethersReadonlyProvider
    );

    contractInstance
      .getProof(ethersSigner.address)
      .then((value: string) => {
        if (sameChain.current(thisChainId) && thisContractAddress === contractRef.current?.address) {
          setProofHandle(value);
        }
      })
      .catch((e: any) => {
        setMessage(`Failed to get proof: ${e.message || "Unknown error"}`);
      });
  }, [contract, ethersReadonlyProvider, ethersSigner, chainId, sameChain]);

  const decryptProof = useCallback(() => {
    if (isDecryptingRef.current || !contract.address || !instance || !ethersSigner) {
      return;
    }

    if (!proofHandle || proofHandle === ethers.ZeroHash) {
      setMessage("No proof to decrypt");
      return;
    }

    if (proofHandle === clearProof?.handle) {
      return;
    }

    const thisChainId = chainId;
    const thisContractAddress = contract.address;
    const thisProofHandle = proofHandle;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Starting decryption...");

    const run = async () => {
      const isStale = () =>
        thisContractAddress !== contractRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [contract.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to create decryption signature. Please try again.");
          return;
        }

        if (isStale()) {
          setMessage("Operation cancelled due to network or account change");
          return;
        }

        setMessage("Decrypting your eligibility result...");

        const res = await instance.userDecrypt(
          [{ handle: thisProofHandle, contractAddress: thisContractAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) {
          return;
        }

        const decryptedValue = res[thisProofHandle as `0x${string}`];
        const clearValue = typeof decryptedValue === "bigint" ? decryptedValue : (typeof decryptedValue === "boolean" ? (decryptedValue ? BigInt(1) : BigInt(0)) : undefined);
        setClearProof({ handle: thisProofHandle, clear: clearValue });
        setMessage(
          `Decryption completed successfully! Your eligibility status has been determined.`
        );
      } catch (error: any) {
        setMessage(`Decryption error: ${error.message || "Failed"}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    contract.address,
    instance,
    proofHandle,
    chainId,
    sameChain,
    sameSigner,
    clearProof,
  ]);

  return {
    contractAddress: contract.address,
    isDeployed,
    canSubmit,
    canGetProof,
    canDecrypt,
    submitMetrics,
    evaluateEligibility,
    refreshProofHandle,
    decryptProof,
    isSubmitting,
    isDecrypting,
    isEvaluating,
    message,
    proofHandle,
    clearProof,
  };
};

