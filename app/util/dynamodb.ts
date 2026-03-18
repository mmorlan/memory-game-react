import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
  await client.send(new UpdateCommand({
    TableName: "memory_users",
    Key: { userID: userId },
    UpdateExpression: "SET #username = :username, bio = :bio",
    ExpressionAttributeNames: { "#username": "username" },
    ExpressionAttributeValues: {
      ":username": fields.username,
      ":bio": fields.bio ?? "",
    },
  }));
}
