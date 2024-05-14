import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FabricatorModule = buildModule("FabricatorModule", (m) => {
  const fabricator = m.contract("Fabricator");

  return { fabricator };
});

export default FabricatorModule;
