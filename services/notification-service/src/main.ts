import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
});

async function bootstrap() {
  const logger = new Logger('NotificationService');
  
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:4001,http://localhost:4002,http://localhost:4003,http://localhost:4004').split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const kafkaBrokers = process.env.KAFKA_BROKERS;
  if (kafkaBrokers && kafkaBrokers.trim()) {
    try {
      await app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [kafkaBrokers.trim()],
          },
          consumer: {
            groupId: 'notification-group',
          },
        },
      });
      await app.startAllMicroservices();
      logger.log('Kafka Consumer is listening for events...');
    } catch (e) {
      logger.warn(`Failed to connect to Kafka: ${e instanceof Error ? e.message : 'Unknown error'}. Notification service will start without Kafka.`);
    }
  } else {
    logger.log('Kafka disabled (KAFKA_BROKERS not set). Running without Kafka consumer.');
  }

  const config = new DocumentBuilder()
    .setTitle('SmartLogi Notification Service')
    .setDescription('Notification Management API for SmartLogi SaaS Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('notifications', 'Notification management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  Sentry.setupExpressErrorHandler(app);

  const port = process.env.PORT || 3006;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`Notification Service is running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();