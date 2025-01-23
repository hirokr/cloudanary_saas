import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";


const prisma = new PrismaClient()


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request : NextRequest) {
  try {
    const videos = await prisma.video.findMany({
      orderBy: {createdAt: "desc"}
    })

    return NextResponse.json(videos)

  } catch (error) {
    return NextResponse.json({error: "Error fetching videos", msg: error}, {status: 500})
  }
  finally {
    await prisma.$disconnect()
  }
}