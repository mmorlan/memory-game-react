import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

function getClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_READONLY_KEY_ID!,
      secretAccessKey: process.env.AWS_READONLY_SECRET!,
    },
  }));
}

async function queryMode(client: DynamoDBDocumentClient, mode: string) {
  const result = await client.send(new QueryCommand({
    TableName: "memory_games",
    IndexName: "leaderboard",
    KeyConditionExpression: "leaderboardkey = :key",
    ExpressionAttributeValues: { ":key": mode },
    ScanIndexForward: false,
    Limit: 100,
  }));
  return result.Items ?? [];
}

export async function GET() {
  try {
    const client = getClient();

    const [freeplayItems, survivalItems] = await Promise.all([
      queryMode(client, "freeplay"),
      queryMode(client, "survival"),
    ]);

    const allItems = [...freeplayItems, ...survivalItems];
    if (allItems.length === 0) return NextResponse.json({ freeplay: [], survival: [] });

    const userIds = [...new Set(allItems.map(e => e.userId as string))];
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

    const enrich = (items: Record<string, unknown>[]) =>
      items.map(e => ({ ...e, username: usernameMap[e.userId as string] }));

    return NextResponse.json({
      freeplay: enrich(freeplayItems),
      survival: enrich(survivalItems),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
