import { createApp } from "./app";
import { connectDB } from "@config/db";
import { env } from "@config/env";

async function bootstrap() {
  try {
    await connectDB(env.MONGO_URI);
    console.log("MongoDB connected");

    const app = createApp();
    const port = env.PORT;
    const appURI = env.APP_URI;
    app.listen(port, () => console.log(`API running at ${appURI}:${port}`));
  } catch (err) {
    console.error("Startup failed", err);
    process.exit(1);
  }
}

bootstrap();
