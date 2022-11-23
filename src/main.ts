import { AppModule } from './app.module';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { HttpExceptionsFilter } from './filters/httpException.filter';

async function bootstrap() {
  const app: NestExpressApplication = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config: ConfigService = app.get(ConfigService);
  const port: number = config.get<number>('PORT') || 3000;

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(
    new HttpExceptionsFilter(app.get(HttpAdapterHost), config),
  );

  // Swagger
  const swaggerOptions: SwaggerDocumentOptions = {};
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Winezone-products')
    .setDescription("Winezone! Product's microservice API")
    .setVersion('1.0')
    .addTag('Products')
    .setLicense(
      'MIT',
      `MIT License

    Copyright (c) 2022 Andrea Metelli

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.`,
    )
    .setContact('Andrea Metelli', null, 'metelliandrea@gmail.com')
    .build();

  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
    swaggerOptions,
  );
  SwaggerModule.setup('api', app, document);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [
          {
            protocol: 'amqp',
            hostname: config.get<string>('RABBITMQ_HOSTNAME') || 'localhost',
            port: config.get<number>('RABBITMQ_PORT') || 5672,
            username: config.get<string>('RABBITMQ_USERNAME') || 'root',
            password: config.get<string>('RABBITMQ_PASSWORD') || 'root',
            vhost: '/',
          },
        ],
        prefetchCount: 1,
        queue: config.get<string>('RABBITMQ_CART_QUEUE_NAME') || 'cart_queue',
        queueOptions: { durable: true },
      },
    },
    { inheritAppConfig: true },
  );

  app.disable('x-powered-by');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
