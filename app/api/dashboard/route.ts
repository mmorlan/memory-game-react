import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

function getClient() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_READONLY_KEY_ID!,
      secretAccessKey: process.env.AWS_READONLY_SECRET!,
    },
  }));
}

async function scanAll(client: DynamoDBDocumentClient, tableName: string) {
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("x-dashboard-key");
  if (authHeader !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getClient();
    const [games, users] = await Promise.all([
      scanAll(client, "memory_games"),
      scanAll(client, "memory_users"),
    ]);

    return NextResponse.json({ games, users });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
