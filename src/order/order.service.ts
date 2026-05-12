import { Injectable } from '@nestjs/common';

@Injectable()
export class OrderService {
  getOrders() {
    return [
      { id: 1, item: 'Laptop', quantity: 1 },
      { id: 2, item: 'Phone', quantity: 2 },
      { id: 3, item: 'Headphones', quantity: 3 },
    ];
  }
}
