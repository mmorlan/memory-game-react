import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";

async function getDocumentClient() {
  const session = await fetchAuthSession();
  const { credentials } = session;

  const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION!,
    credentials: {
      accessKeyId: credentials!.accessKeyId,
      secretAccessKey: credentials!.secretAccessKey,
      sessionToken: credentials!.sessionToken,
    },
  });

  return DynamoDBDocumentClient.from(client);
}

export async function getUser(userId: string) {
  const client = await getDocumentClient();
  const result = await client.send(new GetCommand({
    TableName: "memory_users",
    Key: { userID: userId },
  }));
  return result.Item;
}

export async function updateUser(userId: string, fields: { username?: string; bio?: string }) {
  const client = await getDocumentClient();
  const parts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, string> = {};

  if (fields.username !== undefined) {
    parts.push("#username = :username");
    names["#username"] = "username";
    values[":username"] = fields.username;
  }
  if (fields.bio !== undefined) {
    parts.push("bio = :bio");
    values[":bio"] = fields.bio;
  }
  if (parts.length === 0) return;

  await client.send(new UpdateCommand({
    TableName: "memory_users",
    Key: { userID: userId },
    UpdateExpression: `SET ${parts.join(", ")}`,
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: values,
  }));
}

export interface GameRecord {
  userId: string;
  gameId: string;
  mode: "freeplay" | "survival";
  score: number;
  timeMs: number;
  rows: number;
  cols: number;
  pairs: number;
  completedAt: string;
  leaderboardKey: string;
  stage?: number; // survival only
}

export async function saveGame(userId: string, game: Omit<GameRecord, "userId">): Promise<void> {
  const client = await getDocumentClient();
  await client.send(new PutCommand({
    TableName: "memory_games",
    Item: { userId, ...game },
  }));
}

export async function getUserGames(userId: string): Promise<GameRecord[]> {
  const client = await getDocumentClient();
  const result = await client.send(new QueryCommand({
    TableName: "memory_games",
    KeyConditionExpression: "#uid = :uid",
    ExpressionAttributeNames: { "#uid": "userId" },
    ExpressionAttributeValues: { ":uid": userId },
    ScanIndexForward: false, // newest first
    Limit: 50,
  }));
  return (result.Items ?? []) as GameRecord[];
}
