import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
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
  leaderboardkey: string;
  stage?: number;           // survival only
  avgTimeToPairMs?: number; // freeplay + survival
  clutchPairs?: number;     // survival only
  survived?: boolean;       // survival only
}

export async function saveGame(userId: string, game: Omit<GameRecord, "userId">): Promise<void> {
  const client = await getDocumentClient();
  await client.send(new PutCommand({
    TableName: "memory_games",
    Item: { userId, ...game },
  }));
}

export interface LeaderboardEntry extends GameRecord {
  username?: string;
}

export async function getLeaderboard(leaderboardKey: string, limit = 10): Promise<LeaderboardEntry[]> {
  const client = await getDocumentClient();
  const result = await client.send(new QueryCommand({
    TableName: "memory_games",
    IndexName: "leaderboard",
    KeyConditionExpression: "leaderboardkey = :key",
    ExpressionAttributeValues: { ":key": leaderboardKey },
    ScanIndexForward: false,
    Limit: limit,
  }));
  const entries = (result.Items ?? []) as GameRecord[];
  if (entries.length === 0) return [];

  const userIds = [...new Set(entries.map(e => e.userId))];
  const batchResult = await client.send(new BatchGetCommand({
    RequestItems: {
      memory_users: {
        Keys: userIds.map(id => ({ userID: id })),
        ProjectionExpression: "userID, username",
      },
    },
  }));
  const usernameMap: Record<string, string> = {};
  (batchResult.Responses?.memory_users ?? []).forEach((u) => {
    if (u.userID && u.username) usernameMap[u.userID as string] = u.username as string;
  });

  return entries.map(e => ({ ...e, username: usernameMap[e.userId] }));
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
