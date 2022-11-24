import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { isEmpty } from 'lodash';
import { Logtail } from '@logtail/node';
import { LogLevel } from '@logtail/types';
import { ConfigService } from '@nestjs/config';

const BASE_ERROR_MESSAGE =
  'Something went wrong, please contact your system administrator';

@Catch()
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly config: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const responseHeaders = ctx.getResponse().getHeaders();

    const corrId = isEmpty(responseHeaders)
      ? ctx.getResponse().req.headers['x-correlation-id']
      : responseHeaders['x-correlation-id'];
    const isHttpException = exception instanceof HttpException;

    const httpStatus = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      statusCode: httpStatus,
      message: isHttpException
        ? this.getExceptionMessage(exception)
        : BASE_ERROR_MESSAGE,
      error: isHttpException ? exception.name : 'InternalServerError',
      requestId: corrId,
    };

    // Logtail
    /*const logTail = new Logtail(this.config.get<string>('LOGTAIL_TOKEN'));
    logTail.log(
      isHttpException
        ? this.getExceptionMessage(exception)
        : BASE_ERROR_MESSAGE,
      LogLevel.Error,
      responseBody,
    );*/

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }

  getExceptionMessage(exception: any) {
    const { response } = exception;

    if (response) return response.message;

    return exception.message || undefined;
  }
}
