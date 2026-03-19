import mongoose from "mongoose";
import { getMongoCredentials, getParameter } from "../utils/aws";
import fs from "fs";

export async function connectMongo() {
  const { username, password } = await getMongoCredentials();
  const host = await getParameter("/documentdb/host");
  const port = await getParameter("/documentdb/port");
  const options = await getParameter("/documentdb/options");

  const encodedPassword = encodeURIComponent(password);
  const uri = `mongodb://${username}:${encodedPassword}@${host}:${port}/?${options}`;

  mongoose.connect(uri, {
    tlsCAFile: "/home/ssm-user/global-bundle.pem",
  });

  mongoose.connection.on('error', (e) => console.error('MongoDB error:', e));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
}
