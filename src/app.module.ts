import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { v4 } from 'uuid';
import { CartModule } from './cart/cart.module';
import { HttpModule } from '@nestjs/axios';
import { AuthenticationMiddleware } from './middlewares/auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          name: 'winezone-shopping',
          level: config.get<string>('LOGGER_LEVEL'),
          redact: ['req.headers.authorization'],
          genReqId: (req, res) => {
            if (req.id) return req.id;

            const id = req.headers['x-correlation-id'];
            if (id) return id;

            const corrId = v4();
            res.setHeader('X-Correlation-Id', corrId);
            return corrId;
          },
          transport:
            config.get<string>('NODE_ENV') === 'development'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: true,
                  },
                }
              : undefined,
        },
      }),
      inject: [ConfigService],
    }),
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('AXIOS_BASE_TIMEOUT'),
        // baseURL: config.get<string>('INTERNAL_BASE_URL'),
      }),
      inject: [ConfigService],
    }),
    CartModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthenticationMiddleware)
      // .exclude({ path: 'auth/login/*', method: RequestMethod.POST })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
