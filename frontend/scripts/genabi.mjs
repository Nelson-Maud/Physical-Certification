import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "PhysicalCertification";

// <root>/PhysicalCertification/backend
const rel = "../backend";

// <root>/PhysicalCertification/frontend/abi
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/PhysicalCertification/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

function deployOnHardhatNode() {
  if (process.platform === "win32") {
    // Not supported on Windows
    return;
  }
  try {
    // Use npm script to ensure we use locally installed hardhat
    execSync(`npm run deploy:localhost`, {
      cwd: dir,
      stdio: "inherit",
    });
  } catch (e) {
    console.error(`${line}Script execution failed: ${e}${line}`);
    process.exit(1);
  }
}

function readDeployment(chainName, chainId, contractName, optional) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);

  if (!fs.existsSync(chainDeploymentDir) && chainId === 31337) {
    // Try to auto-deploy the contract on hardhat node!
    deployOnHardhatNode();
  }

  if (!fs.existsSync(chainDeploymentDir)) {
    if (!optional) {
      const deployCmd = chainName === "hardhat" || chainName === "localhost" ? "npm run deploy:localhost" : `npm run deploy:${chainName}`;
      console.error(
        `${line}Unable to locate '${chainDeploymentDir}' directory.\n\n1. Goto '${dirname}' directory\n2. Run '${deployCmd}'.${line}`
      );
      process.exit(1);
    }
    // For optional deployments, just return undefined without error
    return undefined;
  }

  const contractFilePath = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(contractFilePath)) {
    if (!optional) {
      const deployCmd = chainName === "hardhat" || chainName === "localhost" ? "npm run deploy:localhost" : `npm run deploy:${chainName}`;
      console.error(
        `${line}Unable to locate '${contractFilePath}' file.\n\n1. Goto '${dirname}' directory\n2. Run '${deployCmd}'.${line}`
      );
      process.exit(1);
    }
    // For optional deployments, just return undefined without error
    return undefined;
  }

  const jsonString = fs.readFileSync(contractFilePath, "utf-8");

  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;

  return obj;
}

// Try to read deployments - all are optional now
const deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, true /* optional */);
const deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true /* optional */);

// Get ABI from any available deployment, or from artifacts if no deployment exists
let contractABI = null;

if (deployLocalhost && deployLocalhost.abi) {
  contractABI = deployLocalhost.abi;
} else if (deploySepolia && deploySepolia.abi) {
  contractABI = deploySepolia.abi;
} else {
  // Try to read ABI from compiled artifacts
  const artifactsPath = path.join(dir, "artifacts", "contracts", `${CONTRACT_NAME}.sol`, `${CONTRACT_NAME}.json`);
  if (fs.existsSync(artifactsPath)) {
    const artifactContent = fs.readFileSync(artifactsPath, "utf-8");
    const artifact = JSON.parse(artifactContent);
    if (artifact.abi) {
      contractABI = artifact.abi;
      console.log(`Using ABI from compiled artifacts: ${artifactsPath}`);
    }
  }
}

// If still no ABI found, exit with error
if (!contractABI) {
  console.error(
    `${line}Unable to find ABI. Please either:\n1. Deploy the contract: cd ${dirname} && npm run deploy:localhost\n2. Or compile the contract: cd ${dirname} && npm run compile${line}`
  );
  process.exit(1);
}

// Verify ABI consistency if both deployments exist
if (deployLocalhost && deploySepolia) {
  if (JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)) {
    console.error(
      `${line}Deployments on localhost and Sepolia differ. Cant use the same abi on both networks. Consider re-deploying the contracts on both networks.${line}`
    );
    process.exit(1);
  }
}


const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: contractABI }, null, 2)} as const;
\n`;

// Build addresses object dynamically based on available deployments
const addressesEntries = [];
if (deployLocalhost) {
  addressesEntries.push(`  "31337": { address: "${deployLocalhost.address}", chainId: 31337, chainName: "hardhat" }`);
}
if (deploySepolia) {
  addressesEntries.push(`  "11155111": { address: "${deploySepolia.address}", chainId: 11155111, chainName: "sepolia" }`);
}

const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = { 
${addressesEntries.join(",\n")}
};
`;

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);
console.log(tsAddresses);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);

