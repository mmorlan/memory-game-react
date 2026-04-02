import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

function getClient() {
  const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_READONLY_KEY_ID!,
      secretAccessKey: process.env.AWS_READONLY_SECRET!,
    },
  });
  return DynamoDBDocumentClient.from(client);
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") ?? "freeplay";

  try {
    const client = getClient();

    const result = await client.send(new QueryCommand({
      TableName: "memory_games",
      IndexName: "leaderboard",
      KeyConditionExpression: "leaderboardkey = :key",
      ExpressionAttributeValues: { ":key": mode },
      ScanIndexForward: false,
      Limit: 100,
    }));

    const entries = result.Items ?? [];
    if (entries.length === 0) return NextResponse.json([]);

    const userIds = [...new Set(entries.map(e => e.userId as string))];
    const batchResult = await client.send(new BatchGetCommand({
      RequestItems: {
        memory_users: {
          Keys: userIds.map(id => ({ userID: id })),
          ProjectionExpression: "userID, username",
        },
      },
    }));

    const usernameMap: Record<string, string> = {};
    (batchResult.Responses?.memory_users ?? []).forEach(u => {
      if (u.userID && u.username) usernameMap[u.userID as string] = u.username as string;
    });

    const enriched = entries.map(e => ({ ...e, username: usernameMap[e.userId as string] }));
    return NextResponse.json(enriched);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
