const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying MediLedger contract with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString()
  );

  const MediLedger = await hre.ethers.getContractFactory("MediLedger");
  const mediLedger = await MediLedger.deploy();
  await mediLedger.waitForDeployment();

  const contractAddress = await mediLedger.getAddress();
  console.log("MediLedger deployed to:", contractAddress);

  // Read ABI from compiled artifacts
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/MediLedger.sol/MediLedger.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployer: deployer.address,
    abi: artifact.abi,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, "localhost.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
