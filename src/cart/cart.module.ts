import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from 'nestjs-redis';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        password: configService.get<string>('REDIS_PASSWORD'),
        db: configService.get<number>('REDIS_DATABASE_INDEX') || 0,
        keyPrefix: 'basket:',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CartController],
  providers: [
    CartService,
    {
      provide: 'RMQ_PRODUCTS_SERVICE',
      useFactory: (configService: ConfigService) => {
        return ClientProxyFactory.create({
          transport: Transport.RMQ,
          options: {
            urls: [
              {
                protocol: 'amqp',
                hostname:
                  configService.get<string>('RABBITMQ_HOSTNAME') || 'localhost',
                port: configService.get<number>('RABBITMQ_PORT') || 5672,
                username:
                  configService.get<string>('RABBITMQ_USERNAME') || 'root',
                password:
                  configService.get<string>('RABBITMQ_PASSWORD') || 'root',
                vhost: '/',
              },
            ],
            prefetchCount: 1,
            queue:
              configService.get<string>('RABBITMQ_PRODUCTS_QUEUE_NAME') ||
              'products_queue',
            queueOptions: { durable: true },
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class CartModule {}
