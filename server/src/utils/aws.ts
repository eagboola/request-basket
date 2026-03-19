import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const secretsManager = new SecretsManagerClient({ region: "us-east-1" });
const ssmClient = new SSMClient({ region: "us-east-1" });

export async function getPGCredentials() {
  
  const response = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: 'arn:aws:secretsmanager:us-east-1:234308273882:secret:rds!db-41e21a31-25de-4a59-a67f-ec1f8c090475-8udDuu',
    })
  );
    
  if (!response.SecretString) throw new Error("Error retrieving Postgres Credentials");

  return JSON.parse(response.SecretString).password;
}

export async function getMongoCredentials() {
  
  const secretName = "rds!cluster-c78d5988-6005-4135-aac2-8ad4b3f497b1";
  
  const response = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT", // optional, defaults to AWSCURRENT if not provided
      }),
    );

  if (!response.SecretString) throw new Error("Error retrieving MongoDB credentials");
  
  const { username, password } = JSON.parse(response.SecretString);
  return { username, password };
}

export async function getParameter(name: string): Promise<string> {
  const response = await ssmClient.send(
    new GetParameterCommand({
      Name: name,
    }),
  );
  
  if (!response.Parameter || !response.Parameter.Value) throw new Error(`Error retrieving DocumentDB Parameter, ${name}`);
  
  const value = response.Parameter.Value;
  return value;
}

export async function getTokenSecret() {
  const response = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: "arn:aws:secretsmanager:us-east-1:234308273882:secret:JWT-secret-sFLFrF",
    }),
  )
  
  if (!response.SecretString) throw new Error("Error retrieving token secret");

  const secret = JSON.parse(response.SecretString)["JW-secret"];
  return secret;
}