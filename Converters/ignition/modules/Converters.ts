import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
/*
const FabricatorModule = buildModule("FabricatorModule", (m) => {
  const fabricator = m.contract("Fabricator");

  return { fabricator };
});
*/
const RefineryModule = buildModule("RefineryModule", (m) => {
  const refinery = m.contract("Refinery");

  return { refinery };
});

export default {RefineryModule};
