import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET ||
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    ) {
      return NextResponse.json(
        { error: "Cloudinary not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const originalSize = formData.get("originalSize") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(bytes));

    // console.log({
    //   cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    //   api_key: process.env.CLOUDINARY_API_KEY,
    //   api_secret: process.env.CLOUDINARY_API_SECRET,
    // });
    // console.log("File:", file);
    // console.log("Buffer length:", buffer.length);
    // const dummyBuffer = Buffer.from("Test file content");
    // console.log("Dummy buffer length:", dummyBuffer.length);

    const result = await new Promise<CloudinaryUploadResult>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "video",
              folder: "video-uploads",
              chunk_size: 6000000, // 6MB chunks
              timeout: 120000, // 120 seconds timeout
              transformation: [{ quality: "auto", fetch_format: "mp4" }],
            },
            function (error, result) {
              if (error) {
                console.error("Cloudinary upload error:", error);
                return reject(error);
              }
              resolve(result as CloudinaryUploadResult);
            }
          )
          .end(buffer);
      }
    );
    // const result = await cloudinary.uploader.upload();
    console.log("done");
    const video = await prisma.video.create({
      data: {
        title,
        description,
        publicId: result.public_id,
        originalSize: originalSize,
        duration: result.duration || 0,
        compressedSize: String(result.bytes),
      },
    });
    console.log("uploaded");
    console.log(result.public_id);

    return NextResponse.json(video);
  } catch (error) {
    console.log("upload Video failed", error);
    return NextResponse.json({ error: "upload Video failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
