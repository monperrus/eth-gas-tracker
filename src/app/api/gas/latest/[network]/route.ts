import { CreatePublicClient } from "@/app/utils/web3";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatGwei, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";

export const dynamic = "force-static";
export const revalidate = 12;

export async function GET(req: NextRequest, { params }: { params: { network: string } }) {
  console.log(`GET /latest/${params.network}`);

  const mainnet = CreatePublicClient("mainnet");
  const client = CreatePublicClient(params.network as any);

  try {
    const [block, pending, ethPrice] = await Promise.all([
      await client.getBlock({ blockTag: "latest" }),
      await client.getBlock({ blockTag: "pending" }),
      mainnet
        .readContract({
          address: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // Chainlink Price Feed
          abi: parseAbi(["function latestAnswer() view returns (int256)"]),
          functionName: "latestAnswer",
        })
        .then((res) => Math.round((Number(res) / 1e8) * 100) / 100),
    ]);

    const baseFee =
      Math.round(Number(formatGwei(block.baseFeePerGas!!)) * 100) / 100;
    const nextFee =
      Math.round(Number(formatGwei(pending.baseFeePerGas!!)) * 100) / 100;
    return NextResponse.json({
      data: {
        blockNr: String(block.number),
        timestamp: Number(block.timestamp),
        ethPrice: ethPrice,
        baseFee: baseFee,
        nextFee: nextFee,
        difference: Math.round((nextFee - baseFee) * 100) / 100,
        gasLimit: Number(block.gasLimit),
        gasUsed: Number(block.gasUsed),
        utilization: Math.round(
          (Number(block.gasUsed) / Number(block.gasLimit)) * 100
        ),
        transactionCount: block.transactions.length,
        lastUpdate: Date.now(),
      },
    });
  } catch (e) {
    return NextResponse.json(e, { status: 400 });
  }
}
