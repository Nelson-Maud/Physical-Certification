import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPhysicalCertification = await deploy("PhysicalCertification", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(`PhysicalCertification contract: `, deployedPhysicalCertification.address);
};
export default func;
func.id = "deploy_physicalCertification"; // id required to prevent reexecution
func.tags = ["PhysicalCertification"];

