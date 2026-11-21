import { Module } from '@nestjs/common';
import { DemoService } from './demo.service.js';

/** The visitors' example journal (signed into by `POST /auth/demo`). */
@Module({
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
