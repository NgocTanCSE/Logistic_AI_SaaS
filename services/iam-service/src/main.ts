import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';

const logger = new Logger('IAM-Bootstrap');

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
});

process.on('unhandledRejection', (reason) => {
  logger.warn(`Unhandled Rejection: ${reason}`);
});
process.on('uncaughtException', (err) => {
  logger.warn(`Uncaught Exception: ${err.message}`);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:4001,http://localhost:4002,http://localhost:4003,http://localhost:4004').split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(helmet());

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('SmartLogi IAM Service')
    .setDescription('Identity and Access Management API for SmartLogi SaaS Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('admin', 'Admin management endpoints')
    .addTag('tenant', 'Tenant management endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  Sentry.setupExpressErrorHandler(app);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`IAM Service is running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
