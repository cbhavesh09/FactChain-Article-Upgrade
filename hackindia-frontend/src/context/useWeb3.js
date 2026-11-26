import { useContext } from "react";
import { Web3Context } from "./web3context";

export function useWeb3() {
  return useContext(Web3Context);
}

