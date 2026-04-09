import { Module } from '@nestjs/common';
import { EmrService } from './emr.service';
import { EmrController } from './emr.controller';

@Module({
  controllers: [EmrController],
  providers: [EmrService],
  exports: [EmrService],
})
export class EmrModule {}
