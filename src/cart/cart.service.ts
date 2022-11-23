import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { RedisService } from 'nestjs-redis';
import { catchError, lastValueFrom, retry } from 'rxjs';
import { RpcError } from 'src/errors/rpc.error';
import { ExceptionFilter } from 'src/filters/rpcException.filter';
import { CartItemDto } from './dto/cartItem.dto';

@Injectable()
export class CartService {
  private readonly logger: Logger = new Logger(CartService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    @Inject('RMQ_PRODUCTS_SERVICE') private client: ClientProxy,
  ) {}

  @UseFilters(new ExceptionFilter())
  async getAllItemsInCart(user: any): Promise<ICart> {
    try {
      // const { userId } = user;
      const { userId } = { userId: '12345' };
      const cart = { items: [], total: 0 };

      const exists = await this.redis.getClient().exists(userId);
      if (exists) {
        const items = await this.redis.getClient().lrange(userId, -100, 100);

        const json = {};
        items.forEach((i) => (json[i] = (json[i] || 0) + 1));
        delete json[this.config.get<string>('EMPTY_CART_SYMBOL')];

        return Promise.all(
          Array.from(new Set(items)).map(async (i) => {
            try {
              if (i === this.config.get<string>('EMPTY_CART_SYMBOL')) return;

              // __CHIAMATA A RABBIT
              const [details] = await lastValueFrom(
                this.client
                  .send('products_details', {
                    products: [i],
                  })
                  // Listen on errors and throw it
                  .pipe(
                    catchError((err: RpcException) => {
                      // __Enrich error with useful information
                      throw new RpcError(err.message, null, {
                        rmq: {
                          cmd: 'products_details',
                          productId: i,
                        },
                      });
                    }),
                    // Retry command
                    retry({ count: 2, delay: 1000 }),
                  ),
              );

              if (details) {
                const price = json[i] * parseFloat(details.price);

                cart.items.push({
                  productId: i,
                  title: details.title,
                  description: details.description,
                  quantity: json[i],
                  price,
                });

                cart.total += price;
              } else throw new BadRequestException('Invalid productId');
            } catch (err) {
              this.logger.error(
                {
                  userId,
                  function: 'getAllItemsInCart',
                  child:
                    err instanceof RpcError ? (err as RpcError).context : null,
                },
                err.message,
              );

              throw err;
            }
          }),
        ).then(() => cart);

        // return cart;
      }
    } catch (err) {
      throw err;
    }
  }

  async addItemsToCart(user: any, cartItemDto: CartItemDto) {
    try {
      // const { userId } = user;
      const { userId } = { userId: '12345' };

      async function* times(t) {
        let i = 0;
        while (i < t) {
          yield i++;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of times(cartItemDto.quantity)) {
        await this.redis.getClient().lpush(userId, cartItemDto.productId);
      }

      this.notifyStockUpdate(
        cartItemDto,
        this.config.get<string>('ADD_PRODUCTS_TO_STOCK_SYMBOL'),
      );

      this.logger.debug(
        `Item ${cartItemDto.productId} succesfully added, quantity #${cartItemDto.quantity}`,
      );
    } catch (err) {
      this.logger.error(
        {
          userId: user.userId,
          function: 'getAllItemsInCart',
          child: err instanceof RpcError ? (err as RpcError).context : null,
        },
        err.message,
      );

      throw err;
    }
  }

  async removeItemsFromCart(user: any, cartItemDto: CartItemDto) {
    try {
      // const { userId } = user;
      const { userId } = { userId: '12345' };

      async function* times(t) {
        let i = 0;
        while (i < t) {
          yield i++;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of times(cartItemDto.quantity)) {
        await this.redis.getClient().lrem(userId, 1, cartItemDto.productId);
      }

      this.notifyStockUpdate(
        cartItemDto,
        this.config.get<string>('REMOVE_PRODUCTS_FROM_STOCK_SYMBOL'),
      );

      this.logger.debug(
        `Item ${cartItemDto.productId} succesfully removed, quantity #${cartItemDto.quantity}`,
      );
    } catch (err) {
      this.logger.error(
        {
          userId: user.userId,
          function: 'addItemsToCart',
          child: err instanceof RpcError ? (err as RpcError).context : null,
        },
        err.message,
      );

      throw err;
    }
  }

  async emptyCart(user: any) {
    try {
      // const { userId } = user;
      const { userId } = { userId: '12345' };

      const cart = { items: [], total: 0 };

      const exists = await this.redis.getClient().exists(userId);
      if (exists) {
        // Read items from cart
        const items = await this.redis.getClient().lrange(userId, -100, 100);

        // Delete cart
        await this.redis.getClient().del(userId);
        await this.redis
          .getClient()
          .lpush(userId, this.config.get<string>('EMPTY_CART_SYMBOL'));

        const json = {};
        items.forEach((i) => (json[i] = (json[i] || 0) + 1));
        // Remove EMPTY_CART_SYMBOL from Cart in order to avoid errors retrieving informations
        delete json[this.config.get<string>('EMPTY_CART_SYMBOL')];

        Object.entries(json).map(([k, v]) =>
          this.notifyStockUpdate(
            { productId: k, quantity: v as number },
            this.config.get<string>('REMOVE_PRODUCTS_FROM_STOCK_SYMBOL'),
          ),
        );
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  async notifyStockUpdate(cartItem: CartItemDto, action: string) {
    try {
      lastValueFrom(
        this.client
          .send('update_stock', {
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            action,
          })
          // Listen on errors and throw it
          .pipe(
            catchError((err: RpcException) => {
              // __Enrich error with useful information
              throw new RpcError(err.message, null, {
                rmq: {
                  cmd: 'update_stock',
                  productId: cartItem.productId,
                },
              });
            }),
            // Retry command
            retry({ count: 2, delay: 1000 }),
          ),
      );
    } catch (err) {
      this.logger.error(
        {
          function: 'notifyStockUpdate',
          child: err instanceof RpcError ? (err as RpcError).context : null,
        },
        err.message,
      );
    }
  }
}

export interface ICart {
  items: string[];
  total: number;
}
