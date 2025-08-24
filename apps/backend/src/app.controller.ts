import { Controller, Get } from '@nestjs/common'

@Controller('')
export class AppController {
  @Get('health')
  public getHealth(): object {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}
