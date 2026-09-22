import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.ts";
import dotenv from "dotenv";

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.NODE_PORT ?? 3000);
}

bootstrap();
