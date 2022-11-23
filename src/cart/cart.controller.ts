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
  UseGuards,
} from '@nestjs/common';
import { hostname } from 'os';
import { Public } from 'src/decorators/public.decorator';
import { RequiredRoles, Roles } from 'src/decorators/role.decorator';
import { CheckUserRoles } from 'src/guards/role.guard';
import { CartService } from './cart.service';
import { CartItemDto } from './dto/cartItem.dto';

@Controller('cart')
@UseGuards(CheckUserRoles)
@UseInterceptors(ClassSerializerInterceptor)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Public()
  @Header('X-Reply-From', hostname())
  @RequiredRoles(Roles.ADMIN, Roles.PREMIUM, Roles.STANDARD)
  getAllItemsInCart(@Req() req) {
    return this.cartService.getAllItemsInCart(req.user);
  }

  @Post()
  @Header('X-Reply-From', hostname())
  @RequiredRoles(Roles.ADMIN, Roles.PREMIUM, Roles.STANDARD)
  addItemsToCart(@Req() req, @Body() addItemDto: CartItemDto) {
    return this.cartService.addItemsToCart(req.user, addItemDto);
  }

  @Delete(':id')
  @Header('X-Reply-From', hostname())
  @RequiredRoles(Roles.ADMIN, Roles.PREMIUM, Roles.STANDARD)
  removeItemsFromCart(@Req() req, @Body() removeItemDto: CartItemDto) {
    return this.cartService.removeItemsFromCart(req.user, removeItemDto);
  }

  @Delete()
  @Header('X-Reply-From', hostname())
  @RequiredRoles(Roles.ADMIN, Roles.PREMIUM, Roles.STANDARD)
  emptyCart(@Param('id') id: string) {
    return this.cartService.emptyCart(id);
  }
}
