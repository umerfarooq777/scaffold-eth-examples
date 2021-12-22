import { useContractReader } from "eth-hooks";
import React, { useState } from "react";
import { ethers } from "ethers";
import { Input, Button } from "antd";
import { useMemo } from "react";
import { useEffect } from "react";
import { Contract } from "ethers";

import { erc20 } from "../contracts/external_contracts";

const Funding = ({ readContracts, writeContracts, localProvider, targetNetwork, injectedProvider, tx, address }) => {
  const fundingAddress = readContracts.RetroactiveFunding && readContracts.RetroactiveFunding.address;
  const poolAddress = useContractReader(readContracts, "RetroactiveFunding", "getPool");
  const erc20Balance = useContractReader(readContracts, "RetroactiveFunding", "balanceOf", [address]);
  const allowance = useContractReader(readContracts, "RetroactiveFunding", "allowance", [address, fundingAddress]);
  const liquidity = useContractReader(readContracts, "RetroactiveFunding", "getLiquidity");
  const uniswapPrice = useContractReader(readContracts, "RetroactiveFunding", "getPrice");

  const token0 = useContractReader(readContracts, "RetroactiveFunding", "getToken0");
  const token1 = useContractReader(readContracts, "RetroactiveFunding", "getToken1");

  const erc20BalanceFormatted = (erc20Balance && ethers.utils.formatEther(erc20Balance)) || "0.0";
  const liquidityFormatted = (liquidity && ethers.utils.formatEther(liquidity)) || "0.0";
  const uniswapPriceFormatted = (uniswapPrice && ethers.utils.formatEther(uniswapPrice)) || "0.0";

  const [fund, setFund] = useState(null);
  const [sell, setSell] = useState(null);
  const [tokens, setTokens] = useState(["", ""]);

  const fundProject = () => {
    tx(
      writeContracts.RetroactiveFunding.fundProject({
        value: ethers.utils.parseEther(fund),
      }),
    );
  };

  const approveTokens = () => {
    tx(writeContracts.RetroactiveFunding.approve(fundingAddress, ethers.utils.parseEther(sell)));
  };

  const sellTokens = () => {
    tx(writeContracts.RetroactiveFunding.sellToken(ethers.utils.parseEther(sell)));
  };

  const lowApproval = useMemo(() => {
    if (!allowance || !sell) return true;
    const sellAmount = ethers.utils.parseEther(sell);
    if (allowance.lt(sellAmount)) return true;
    return false;
  }, [allowance, sell]);

  const fetchTokenSymbol = async tokenAddress => {
    const contract = new Contract(token0, erc20, localProvider);
    const symbol = await contract.symbol();
    return symbol;
  };

  useEffect(() => {
    const fetchTokens = async (token0, token1) => {
      if (!token0 || !token1) return;
      const symbols = await Promise.all([fetchTokenSymbol(token0), fetchTokenSymbol(token1)]);
      setTokens(symbols);
    };

    fetchTokens(token0, token1);
  }, [token0, token1]);

  return (
    <div style={{ margin: "0 auto", maxWidth: 560, paddingTop: 20, textAlign: "left" }}>
      <p style={{ margin: 0 }}>
        <b>Uniswap Pool:</b>{" "}
        <a target="_blank" href={`${targetNetwork.blockExplorer}/address/${poolAddress}`}>
          {poolAddress}
        </a>
      </p>
      <p style={{ margin: 0 }}>
        <b>Liquidity:</b> {liquidityFormatted.substring(0, 7)} ETH
      </p>
      <p style={{ margin: 0 }}>
        <b>Uniswap Price:</b>{" "}
        {liquidity && liquidity.gt(0) ? uniswapPriceFormatted.substring(0, 7) : "No liquidity in the pool"} ETH
      </p>
      <p>
        <b>My ERC20 Balance:</b> {erc20BalanceFormatted} tokens
      </p>
      <p>
        <b>Token A:</b>{" "}
        <a target="_blank" href={`${targetNetwork.blockExplorer}/address/${token0}`}>
          {tokens[0]}
        </a>
        <br />
        <b>Token B:</b>{" "}
        <a target="_blank" href={`${targetNetwork.blockExplorer}/address/${token1}`}>
          {tokens[1]}
        </a>
      </p>
      <div style={{ paddingTop: 15, paddingBottom: 15 }}>
        <p>
          <b>Whale Form</b>
        </p>
        <Input
          type="number"
          placeholder="1 ETH"
          style={{ marginBottom: 10 }}
          value={fund}
          onChange={e => setFund(e.target.value)}
        />
        <Button disabled={!fund || !injectedProvider} onClick={fundProject}>
          Fund project
        </Button>
      </div>
      <div style={{ paddingTop: 10, paddingBottom: 20 }}>
        <p>
          <b>Project owner form</b>
        </p>
        <Input
          type="number"
          placeholder="20 tokens"
          style={{ marginBottom: 10 }}
          value={sell}
          onChange={e => setSell(e.target.value)}
        />
        {lowApproval ? (
          <Button disabled={!sell} onClick={approveTokens}>
            Approve tokens
          </Button>
        ) : (
          <Button disabled={!sell} onClick={sellTokens}>
            Sell tokens
          </Button>
        )}
      </div>
    </div>
  );
};

export default Funding;
