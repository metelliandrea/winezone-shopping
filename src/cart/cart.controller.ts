import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Header,
  Req,
  Post,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { hostname } from 'os';
import { Public } from 'src/decorators/public.decorator';
import { CartService } from './cart.service';
import { CartItemDto } from './dto/cartItem.dto';

@Controller('cart')
@UseInterceptors(ClassSerializerInterceptor)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Public()
  @Header('X-Reply-From', hostname())
  getAllItemsInCart(@Req() req) {
    return this.cartService.getAllItemsInCart(req.user);
  }

  @Post()
  @Header('X-Reply-From', hostname())
  addItemsToCart(@Req() req, @Body() addItemDto: CartItemDto) {
    return this.cartService.addItemsToCart(req.user, addItemDto);
  }

  @Delete(':id')
  @Header('X-Reply-From', hostname())
  removeItemsFromCart(@Req() req, @Body() removeItemDto: CartItemDto) {
    return this.cartService.removeItemsFromCart(req.user, removeItemDto);
  }

  @Delete()
  @Header('X-Reply-From', hostname())
  emptyCart(@Param('id') id: string) {
    return this.cartService.emptyCart(id);
  }
}
