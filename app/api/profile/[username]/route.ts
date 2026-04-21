import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

function getClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_READONLY_KEY_ID!,
      secretAccessKey: process.env.AWS_READONLY_SECRET!,
    },
  }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const client = getClient();

    const userResult = await client.send(new QueryCommand({
      TableName: "memory_users",
      IndexName: "username-index",
      KeyConditionExpression: "username = :u",
      ExpressionAttributeValues: { ":u": username },
      Limit: 1,
    }));

    const user = userResult.Items?.[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const gamesResult = await client.send(new QueryCommand({
      TableName: "memory_games",
      KeyConditionExpression: "#uid = :uid",
      ExpressionAttributeNames: { "#uid": "userId" },
      ExpressionAttributeValues: { ":uid": user.userID },
      ScanIndexForward: false,
      Limit: 50,
    }));

    return NextResponse.json({
      username: user.username,
      bio: user.bio ?? "",
      games: gamesResult.Items ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
