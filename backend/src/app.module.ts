import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { WillModule } from './will/will.module';
import { ChatModule } from './chat/chat.module';
import { DocumentModule } from './document/document.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'willmaker'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // We use init.sql for schema
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    WillModule,
    ChatModule,
    DocumentModule,
  ],
})
export class AppModule {}
